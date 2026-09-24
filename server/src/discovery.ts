import dgram from "node:dgram";
import os from "node:os";
import crypto from "node:crypto";

import { addDevice, getDevice, sweepStaleDevices } from "./deviceStore.js";

const DISCOVERY_PORT = 4242;
const HEARTBEAT_INTERVAL = 3_000; // ms
const SWEEP_INTERVAL = 3_000; // ms — how often we check for stale peers

const sessionId = crypto.randomUUID();
let deviceName =
  process.env.COMPUTERNAME ||
  process.env.HOSTNAME ||
  "OfflineConnect device";

export function getSessionId(): string {
  return sessionId;
}

export function getDeviceName(): string {
  return deviceName;
}

export function setDeviceName(name: unknown): void {
  if (typeof name !== "string") {
    return;
  }

  const normalizedName = name.trim();
  if (normalizedName) {
    deviceName = normalizedName.slice(0, 80);
  }
}

// ─── Network helpers ────────────────────────────────────────────────

/** Compute broadcast addresses for all non-internal IPv4 interfaces. */
function getBroadcastAddresses(): string[] {
  const addresses = new Set<string>();
  addresses.add("255.255.255.255");

  const interfaces = os.networkInterfaces();
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family !== "IPv4" || net.internal) continue;

      const ip = net.address.split(".").map(Number);
      const mask = net.netmask.split(".").map(Number);
      const bcast = ip.map(
        (octet, i) => octet | (~(mask[i] ?? 255) & 255),
      );
      addresses.add(bcast.join("."));
    }
  }

  return Array.from(addresses);
}

/** Build the JSON announce packet. */
function buildAnnounce(tcpPort: number): string {
  return JSON.stringify({
    type: "ANNOUNCE",
    sessionId,
    name: deviceName,
    tcpPort,
  });
}

// ─── Discovery ──────────────────────────────────────────────────────

export function startDiscovery(
  tcpPort: number,
  onDevicesChanged?: () => void,
) {
  // Bug #3 fix: reuseAddr so two instances on the same machine don't crash
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  // Bug #5 fix: store interval refs so they can be cleaned up
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  function cleanup(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  }

  socket.on("listening", () => {
    socket.setBroadcast(true);

    // ── Periodic heartbeat broadcast ──
    heartbeatTimer = setInterval(() => {
      const message = buildAnnounce(tcpPort);
      const broadcastAddrs = getBroadcastAddresses();

      for (const addr of broadcastAddrs) {
        socket.send(message, DISCOVERY_PORT, addr, (err) => {
          // Silently ignore expected broadcast errors
          if (
            err &&
            !err.message?.includes("EPERM") &&
            !err.message?.includes("ENETUNREACH") &&
            !err.message?.includes("EACCES")
          ) {
            console.log(`Broadcast error (${addr}):`, err.message);
          }
        });
      }
    }, HEARTBEAT_INTERVAL);

    // ── Periodic presence sweep ──
    sweepTimer = setInterval(() => {
      const wentOffline = sweepStaleDevices();
      if (wentOffline.length > 0) {
        for (const name of wentOffline) {
          console.log(`Peer offline: ${name}`);
        }
        onDevicesChanged?.();
      }
    }, SWEEP_INTERVAL);

    console.log("UDP discovery started");
  });

  // ── Receive ANNOUNCE from peers ──
  socket.on("message", (msg, rinfo) => {
    let data: { sessionId?: unknown; name?: unknown; tcpPort?: unknown };

    try {
      data = JSON.parse(msg.toString());
    } catch {
      return; // malformed packet — ignore
    }

    // Validate fields
    if (
      typeof data.sessionId !== "string" ||
      typeof data.tcpPort !== "number" ||
      !Number.isInteger(data.tcpPort) ||
      data.tcpPort < 1 ||
      data.tcpPort > 65535 ||
      data.sessionId === sessionId // ignore our own packets
    ) {
      return;
    }

    // Check if this is a genuinely new peer or one coming back online
    const existing = getDevice(data.sessionId);
    const isNew = !existing;
    const wasOffline = existing != null && !existing.online;

    const device = {
      sessionId: data.sessionId,
      name:
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim().slice(0, 80)
          : "OfflineConnect device",
      ip: rinfo.address,
      tcpPort: data.tcpPort,
      udpPort: rinfo.port,
      udpFamily: rinfo.family,
      lastSeen: Date.now(),
      online: true,
    };

    addDevice(device);

    if (isNew) {
      console.log(
        `Peer discovered: ${device.name} (${device.ip}:${device.tcpPort})`,
      );
      onDevicesChanged?.();
    } else if (wasOffline) {
      console.log(
        `Peer back online: ${device.name} (${device.ip}:${device.tcpPort})`,
      );
      onDevicesChanged?.();
    }

    // Bilateral reply for hotspot compatibility
    if (isNew || wasOffline) {
      const reply = buildAnnounce(tcpPort);
      socket.send(reply, DISCOVERY_PORT, rinfo.address, () => {});
    }
  });

  socket.on("error", (err) => {
    console.error("UDP discovery socket error:", err.message);
    cleanup();
    socket.close();
  });

  socket.bind(DISCOVERY_PORT);

  return { socket, cleanup };
}
