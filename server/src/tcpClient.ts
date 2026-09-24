import net from "node:net";
import { getDevice } from "./deviceStore.js";

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

type StateListener = (
  sessionId: string,
  state: PeerConnectionState,
  error?: string,
) => void;

interface PeerConnEntry {
  socket: net.Socket | null;
  state: PeerConnectionState;
  connectPromise: Promise<boolean> | null;
}

// Active connections indexed by peer sessionId
const peerConnections = new Map<string, PeerConnEntry>();
const stateListeners = new Set<StateListener>();

export function onPeerStateChange(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
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
 * Connect to a peer's TCP server.
 * Returns true if connected or already connected.
 * Prevents duplicate concurrent connection attempts.
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
    // If already connected, return immediately
    if (existing.state === "connected" && existing.socket && !existing.socket.destroyed) {
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

  const connectPromise = new Promise<boolean>((resolve) => {
    let resolved = false;

    const socket = net.createConnection(
      { port: device.tcpPort, host: cleanIp, timeout: 5000 },
      () => {
        resolved = true;
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
        socket.destroy();
        notifyState(sessionId, "failed/offline", "Connection timed out");
        resolve(false);
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        notifyState(sessionId, "failed/offline", err.message);
        resolve(false);
      } else {
        notifyState(sessionId, "failed/offline", err.message);
      }
    });

    socket.on("close", () => {
      const dev = getDevice(sessionId);
      const isStillOnline = dev && dev.online;
      notifyState(sessionId, isStillOnline ? "disconnected" : "failed/offline");
      const currentEntry = peerConnections.get(sessionId);
      if (currentEntry && currentEntry.socket === socket) {
        currentEntry.socket = null;
        currentEntry.connectPromise = null;
      }
    });

    peerConnections.set(sessionId, {
      socket,
      state: isReconnect ? "reconnecting" : "connecting",
      connectPromise: null, // will be attached below
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

  // Ensure connected socket
  const connected = await connectToPeer(sessionId);
  if (!connected) {
    console.log(`[TCP Send] Failed to connect to ${device.name}`);
    return false;
  }

  const entry = peerConnections.get(sessionId);
  if (!entry || !entry.socket || entry.socket.destroyed) {
    console.log(`[TCP Send] Socket not available for ${device.name}`);
    notifyState(sessionId, "failed/offline", "Socket disconnected");
    return false;
  }

  return new Promise<boolean>((resolve) => {
    // Newline-delimited framing
    const payload =
      JSON.stringify({
        type: "chat",
        ...message,
      }) + "\n";

    entry.socket!.write(payload, (err) => {
      if (err) {
        console.log(`[TCP Send] Write error to ${device.name}:`, err.message);
        resolve(false);
      } else {
        const current = getDevice(sessionId);
        if (current) {
          current.lastSeen = Date.now();
        }
        resolve(true);
      }
    });
  });
}
