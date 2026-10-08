import net from "node:net";
import { getDevice, addDevice } from "./deviceStore.js";

export type PeerConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed/offline";

export interface ChatMessage {
  id?: string;
  senderName: string;
  senderSessionId: string;
  text: string;
  timestamp: number;
}

export type StateListener = (
  sessionId: string,
  state: PeerConnectionState,
  error?: string,
) => void;

export type ChatMessageListener = (
  message: ChatMessage,
  socket: net.Socket,
) => void;

interface PeerConnEntry {
  socket: net.Socket | null;
  state: PeerConnectionState;
  connectPromise: Promise<boolean> | null;
  isOutbound: boolean;
  peerName?: string;
  tcpPort?: number;
}

// Active connections indexed by peer sessionId (both inbound and outbound)
const peerConnections = new Map<string, PeerConnEntry>();
const stateListeners = new Set<StateListener>();
const chatMessageListeners = new Set<ChatMessageListener>();

// Unauthenticated incoming sockets awaiting handshake
const unauthenticatedSockets = new Map<net.Socket, NodeJS.Timeout>();

// Local device identity
let mySessionId = "";
let myDeviceName = "OfflineConnect device";
let myTcpPort = 8080;

export function setSelfInfo(info: {
  sessionId?: string;
  name?: string;
  tcpPort?: number;
}): void {
  if (info.sessionId) mySessionId = info.sessionId;
  if (info.name) myDeviceName = info.name;
  if (info.tcpPort) myTcpPort = info.tcpPort;
}

export function getSelfInfo(): {
  sessionId: string;
  name: string;
  tcpPort: number;
} {
  return {
    sessionId: mySessionId,
    name: myDeviceName,
    tcpPort: myTcpPort,
  };
}

export function onPeerStateChange(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function onChatMessage(listener: ChatMessageListener): () => void {
  chatMessageListeners.add(listener);
  return () => {
    chatMessageListeners.delete(listener);
  };
}

function dispatchChatMessage(msg: ChatMessage, socket: net.Socket): void {
  for (const listener of chatMessageListeners) {
    try {
      listener(msg, socket);
    } catch (e) {
      console.error("[TCP] Error in chat message listener:", e);
    }
  }
}

function notifyState(
  sessionId: string,
  state: PeerConnectionState,
  error?: string,
) {
  const entry = peerConnections.get(sessionId);
  if (entry) {
    entry.state = state;
  }
  for (const listener of stateListeners) {
    try {
      listener(sessionId, state, error);
    } catch (e) {
      console.error("[TCP Client] Error in state listener:", e);
    }
  }
}

export function getPeerState(sessionId: string): PeerConnectionState {
  const entry = peerConnections.get(sessionId);
  if (!entry) {
    const dev = getDevice(sessionId);
    return dev && dev.online ? "disconnected" : "failed/offline";
  }
  return entry.state;
}

/**
 * Handle a newly accepted incoming TCP socket.
 * Starts a 5-second handshake timer.
 */
export function handleIncomingSocket(socket: net.Socket): void {
  const cleanIp = socket.remoteAddress
    ? socket.remoteAddress.replace(/^::ffff:/, "")
    : "unknown";

  const timeoutTimer = setTimeout(() => {
    if (unauthenticatedSockets.has(socket)) {
      console.log(`[TCP] Connection timeout (handshake) from ${cleanIp}:${socket.remotePort}`);
      unauthenticatedSockets.delete(socket);
      socket.destroy();
    }
  }, 5000);

  unauthenticatedSockets.set(socket, timeoutTimer);

  socket.on("close", () => {
    const timer = unauthenticatedSockets.get(socket);
    if (timer) {
      clearTimeout(timer);
      unauthenticatedSockets.delete(socket);
    }
  });
}

/**
 * Process incoming framed TCP lines (handshake, handshake_ack, duplicate, chat).
 * Used by both tcpServer (inbound sockets) and tcpClient (outbound sockets).
 */
export function handleIncomingTcpData(
  data: string,
  socket: net.Socket,
  onChatCallback?: (msg: ChatMessage) => void,
): boolean {
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    return false;
  }

  // Clear unauthenticated handshake timer for this socket
  const timer = unauthenticatedSockets.get(socket);
  if (timer) {
    clearTimeout(timer);
    unauthenticatedSockets.delete(socket);
  }

  if (parsed.type === "handshake") {
    const remoteSessionId = parsed.sessionId;
    const remoteName =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : "Peer";
    const remoteTcpPort =
      typeof parsed.tcpPort === "number" && Number.isInteger(parsed.tcpPort)
        ? parsed.tcpPort
        : 8080;

    if (
      !remoteSessionId ||
      typeof remoteSessionId !== "string" ||
      remoteSessionId === mySessionId
    ) {
      socket.destroy();
      return true;
    }

    const cleanIp = socket.remoteAddress
      ? socket.remoteAddress.replace(/^::ffff:/, "")
      : "127.0.0.1";

    // Check duplicate connection
    const existing = peerConnections.get(remoteSessionId);
    if (
      existing &&
      existing.socket &&
      !existing.socket.destroyed &&
      existing.state === "connected"
    ) {
      // Deterministic tie breaker: higher sessionId wins as connection initiator
      if (mySessionId > remoteSessionId) {
        console.log(
          `[TCP] Duplicate connection from ${remoteName} (${remoteSessionId}) rejected (we are initiator)`,
        );
        try {
          socket.end(JSON.stringify({ type: "duplicate" }) + "\n");
        } catch {}
        return true;
      } else {
        console.log(
          `[TCP] Duplicate connection from ${remoteName} (${remoteSessionId}): adopting incoming connection`,
        );
        try {
          existing.socket.destroy();
        } catch {}
      }
    }

    // Register or update peer in deviceStore
    const existingDev = getDevice(remoteSessionId);
    if (existingDev) {
      existingDev.lastSeen = Date.now();
      existingDev.online = true;
    } else {
      addDevice({
        sessionId: remoteSessionId,
        name: remoteName,
        ip: cleanIp,
        tcpPort: remoteTcpPort,
        udpPort: 4242,
        udpFamily: "IPv4",
        lastSeen: Date.now(),
        online: true,
      });
    }

    // Store inbound socket in peerConnections
    peerConnections.set(remoteSessionId, {
      socket,
      state: "connected",
      connectPromise: null,
      isOutbound: false,
      peerName: remoteName,
      tcpPort: remoteTcpPort,
    });

    // Send handshake_ack back
    const ackPayload =
      JSON.stringify({
        type: "handshake_ack",
        sessionId: mySessionId,
        name: myDeviceName,
        tcpPort: myTcpPort,
      }) + "\n";

    try {
      socket.write(ackPayload);
    } catch {}

    console.log(`[TCP] Connected to ${remoteName}`);
    notifyState(remoteSessionId, "connected");

    socket.on("close", () => {
      console.log(`[TCP] Socket closed for ${remoteName}`);
      const entry = peerConnections.get(remoteSessionId);
      if (entry && entry.socket === socket) {
        entry.socket = null;
        const dev = getDevice(remoteSessionId);
        notifyState(
          remoteSessionId,
          dev && dev.online ? "disconnected" : "failed/offline",
        );
      }
    });

    socket.on("error", (err) => {
      console.log(`[TCP] Socket error for ${remoteName}:`, err.message);
      const entry = peerConnections.get(remoteSessionId);
      if (entry && entry.socket === socket) {
        notifyState(remoteSessionId, "failed/offline", err.message);
      }
    });

    return true;
  }

  if (parsed.type === "handshake_ack") {
    const remoteSessionId = parsed.sessionId;
    const remoteName =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : "Peer";
    console.log(`[TCP] Connected to ${remoteName}`);

    if (remoteSessionId && typeof remoteSessionId === "string") {
      const entry = peerConnections.get(remoteSessionId);
      if (entry) {
        entry.state = "connected";
      }
      notifyState(remoteSessionId, "connected");
    }
    return true;
  }

  if (parsed.type === "duplicate") {
    console.log(`[TCP] Remote peer marked connection as duplicate, closing`);
    socket.destroy();
    return true;
  }

  if (parsed.type === "chat") {
    // If not yet associated with peer, register implicit connection (backward compat)
    if (
      parsed.senderSessionId &&
      typeof parsed.senderSessionId === "string" &&
      parsed.senderSessionId !== mySessionId
    ) {
      const existingEntry = peerConnections.get(parsed.senderSessionId);
      if (
        !existingEntry ||
        !existingEntry.socket ||
        existingEntry.socket.destroyed
      ) {
        peerConnections.set(parsed.senderSessionId, {
          socket,
          state: "connected",
          connectPromise: null,
          isOutbound: false,
          peerName: parsed.senderName,
        });
        notifyState(parsed.senderSessionId, "connected");
      }

      const sender = getDevice(parsed.senderSessionId);
      if (sender) {
        sender.lastSeen = Date.now();
        sender.online = true;
      }
    }

    console.log(
      `[TCP] Message received from ${parsed.senderName}: ${parsed.text}`,
    );

    if (onChatCallback) {
      onChatCallback(parsed);
    }
    dispatchChatMessage(parsed, socket);
    return true;
  }

  return false;
}

/**
 * Connect to a peer's TCP server (outbound).
 * Returns true if connected or already connected.
 * Prevents duplicate concurrent connection attempts.
 * If a healthy incoming connection already exists, reuses it!
 */
export function connectToPeer(
  sessionId: string,
  isReconnect = false,
): Promise<boolean> {
  const device = getDevice(sessionId);
  if (!device || !device.online) {
    notifyState(sessionId, "failed/offline", "Device is offline or not found");
    return Promise.resolve(false);
  }

  const existing = peerConnections.get(sessionId);
  if (existing) {
    // If already connected with healthy socket (inbound or outbound), reuse it!
    if (
      existing.state === "connected" &&
      existing.socket &&
      !existing.socket.destroyed
    ) {
      console.log(`[TCP] Reusing existing healthy connection to ${device.name}`);
      return Promise.resolve(true);
    }
    // If already connecting, return existing promise to prevent duplicate attempts
    if (existing.connectPromise && existing.state === "connecting") {
      return existing.connectPromise;
    }
    // Clean up dead socket if any
    if (existing.socket && !existing.socket.destroyed) {
      existing.socket.destroy();
    }
  }

  notifyState(sessionId, isReconnect ? "reconnecting" : "connecting");

  const cleanIp = device.ip.replace(/^::ffff:/, "");
  console.log(`[TCP] Connecting to ${cleanIp}:${device.tcpPort}`);

  const connectPromise = new Promise<boolean>((resolve) => {
    let resolved = false;

    const socket = net.createConnection(
      { port: device.tcpPort, host: cleanIp, timeout: 5000 },
      () => {
        resolved = true;
        console.log(`[TCP] Connected to ${device.name}`);

        // Send handshake
        const handshakePayload =
          JSON.stringify({
            type: "handshake",
            sessionId: mySessionId,
            name: myDeviceName,
            tcpPort: myTcpPort,
          }) + "\n";

        socket.write(handshakePayload);

        const current = getDevice(sessionId);
        if (current) {
          current.lastSeen = Date.now();
        }
        notifyState(sessionId, "connected");
        resolve(true);
      },
    );

    socket.setEncoding("utf-8");

    socket.on("timeout", () => {
      if (!resolved) {
        resolved = true;
        console.log(`[TCP] Connection timeout to ${cleanIp}:${device.tcpPort}`);
        socket.destroy();
        notifyState(sessionId, "failed/offline", "Connection timed out");
        resolve(false);
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        if (err.message.includes("ECONNREFUSED")) {
          console.log(`[TCP] Connection refused at ${cleanIp}:${device.tcpPort}`);
        } else {
          console.log(
            `[TCP] Socket error to ${cleanIp}:${device.tcpPort}: ${err.message}`,
          );
        }
        notifyState(sessionId, "failed/offline", err.message);
        resolve(false);
      } else {
        console.log(`[TCP] Socket error for ${device.name}:`, err.message);
        notifyState(sessionId, "failed/offline", err.message);
      }
    });

    socket.on("close", () => {
      console.log(`[TCP] Socket closed for ${device.name}`);
      const dev = getDevice(sessionId);
      const isStillOnline = dev && dev.online;
      notifyState(sessionId, isStillOnline ? "disconnected" : "failed/offline");
      const currentEntry = peerConnections.get(sessionId);
      if (currentEntry && currentEntry.socket === socket) {
        currentEntry.socket = null;
        currentEntry.connectPromise = null;
      }
    });

    // Buffer incoming data on outbound socket to process handshake_ack and incoming chat
    let buffer = "";
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.length > 0) {
          handleIncomingTcpData(line, socket);
        }
      }
    });

    peerConnections.set(sessionId, {
      socket,
      state: isReconnect ? "reconnecting" : "connecting",
      connectPromise: null,
      isOutbound: true,
      peerName: device.name,
      tcpPort: device.tcpPort,
    });
  });

  const entry = peerConnections.get(sessionId);
  if (entry) {
    entry.connectPromise = connectPromise;
  }

  return connectPromise;
}

/**
 * Disconnect a specific peer cleanly.
 */
export function disconnectPeer(sessionId: string): void {
  const entry = peerConnections.get(sessionId);
  if (entry) {
    if (entry.socket && !entry.socket.destroyed) {
      entry.socket.destroy();
    }
    peerConnections.delete(sessionId);
    notifyState(sessionId, "disconnected");
  }
}

/**
 * Disconnect all peers (e.g. on shutdown).
 */
export function disconnectAllPeers(): void {
  for (const [sessionId, entry] of peerConnections.entries()) {
    if (entry.socket && !entry.socket.destroyed) {
      entry.socket.destroy();
    }
    notifyState(sessionId, "disconnected");
  }
  peerConnections.clear();
}

/**
 * Send a message to a peer over TCP.
 * Uses an existing healthy connection (inbound or outbound) if available!
 * Connects if not already connected.
 * Ensures newline-delimited framing.
 */
export async function sendMessageToDevice(
  sessionId: string,
  message: ChatMessage,
): Promise<boolean> {
  const device = getDevice(sessionId);
  if (!device || !device.online) {
    console.log(`[TCP Send] Device not found or offline: ${sessionId}`);
    notifyState(sessionId, "failed/offline", "Device is offline");
    return false;
  }

  // Check if we ALREADY have a usable connected socket (inbound or outbound)
  const existing = peerConnections.get(sessionId);
  let socketToUse: net.Socket | null = null;

  if (
    existing &&
    existing.state === "connected" &&
    existing.socket &&
    !existing.socket.destroyed
  ) {
    socketToUse = existing.socket;
  } else {
    // No healthy connection exists yet: initiate connection
    const connected = await connectToPeer(sessionId);
    if (!connected) {
      console.log(`[TCP Send] Failed to connect to ${device.name}`);
      return false;
    }
    const currentEntry = peerConnections.get(sessionId);
    if (
      currentEntry &&
      currentEntry.socket &&
      !currentEntry.socket.destroyed
    ) {
      socketToUse = currentEntry.socket;
    }
  }

  if (!socketToUse || socketToUse.destroyed) {
    console.log(`[TCP Send] Socket not available for ${device.name}`);
    notifyState(sessionId, "failed/offline", "Socket disconnected");
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const payload =
      JSON.stringify({
        type: "chat",
        ...message,
      }) + "\n";

    socketToUse!.write(payload, (err) => {
      if (err) {
        console.log(`[TCP Send] Write error to ${device.name}:`, err.message);
        resolve(false);
      } else {
        console.log(`[TCP] Message sent to ${device.name}: ${message.text}`);
        const current = getDevice(sessionId);
        if (current) {
          current.lastSeen = Date.now();
        }
        resolve(true);
      }
    });
  });
}

