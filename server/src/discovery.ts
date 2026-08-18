import dgram from "node:dgram";
import { addDevice, removeDevice, getDevice, getDevices } from "./deviceStore";
import { devicesI } from "./types";

import crypto from "node:crypto";
import os from "node:os";

// ─── Shared state: sessionId and device name ─────────────────────────
const sessionId = crypto.randomUUID();
let deviceName = os.hostname() ?? "Desktop";

export function getSessionId(): string {
  return sessionId;
}

export function setDeviceName(name: string) {
  deviceName = name;
}

export function getDeviceName(): string {
  return deviceName;
}

// ─── Network helpers ─────────────────────────────────────────────────

function getDiscoveryTargets(): { broadcasts: string[]; unicasts: string[] } {
  const broadcasts = new Set<string>();
  broadcasts.add("255.255.255.255");

  const unicasts: string[] = [];
  const selfIps = new Set<string>();

  const interfaces = os.networkInterfaces();
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family !== "IPv4" || net.internal) continue;

      selfIps.add(net.address);

      const ip = net.address.split(".").map(Number);
      const mask = net.netmask.split(".").map(Number);

      // Subnet-directed broadcast (e.g. 192.168.43.255)
      const bcast = ip.map((octet, i) => octet | (~(mask[i]!) & 255));
      broadcasts.add(bcast.join("."));

      // Unicast targets for /24-or-smaller subnets (hotspot fallback)
      if (mask[0] === 255 && mask[1] === 255 && mask[2] === 255) {
        const networkBase = ip[3]! & mask[3]!;
        const hostMax = ~mask[3]! & 255;
        const prefix = `${ip[0]}.${ip[1]}.${ip[2]}`;

        for (let h = 1; h < hostMax; h++) {
          const target = `${prefix}.${networkBase + h}`;
          if (!selfIps.has(target)) {
            unicasts.push(target);
          }
        }
      }
    }
  }

  return { broadcasts: Array.from(broadcasts), unicasts };
}

// ─── Discovery & Presence Engine ─────────────────────────────────────

export const startDiscovery = (TCP_PORT: number) => {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  const getPacket = () => JSON.stringify({
    type: "PRESENCE",
    device_name: deviceName,
    sessionId,
    tcpPort: TCP_PORT,
  });

  socket.on("listening", () => {
    socket.setBroadcast(true);

    const initialTargets = getDiscoveryTargets();
    console.log("Broadcast targets:", initialTargets.broadcasts);
    console.log(`Unicast scan targets: ${initialTargets.unicasts.length} addresses`);

    // ── Loop 1: Direct Keep-Alive to Known Peers (Every 2 seconds) ──
    // Once a device is discovered, we ping its exact IP directly.
    // This gives rock-solid stability with zero packet loss.
    setInterval(() => {
      const packet = getPacket();
      const devices = getDevices();

      devices.forEach((device: devicesI) => {
        socket.send(packet, 4242, device.ip, () => {});
      });
    }, 2000);

    // ── Loop 2: Subnet Broadcast (Every 3 seconds) ──
    // Broadcasts for networks that support it (wired LAN / standard Wi-Fi routers)
    setInterval(() => {
      const packet = getPacket();
      const targets = getDiscoveryTargets();

      for (const addr of targets.broadcasts) {
        socket.send(packet, 4242, addr, (err) => {
          if (err && !err.message?.includes("EPERM") && !err.message?.includes("ENETUNREACH") && !err.message?.includes("EACCES")) {
            console.log(`Broadcast error (${addr}):`, err.message);
          }
        });
      }
    }, 3000);

    // ── Loop 3: Background Subnet Scanner (Every 8 seconds) ──
    // Scans whole subnet in small batches to find new/unconnected devices on hotspots
    setInterval(() => {
      const packet = getPacket();
      const targets = getDiscoveryTargets();
      if (targets.unicasts.length === 0) return;

      let index = 0;
      const batchSize = 15;
      const batchDelay = 40; // ms between batches

      const batchTimer = setInterval(() => {
        const end = Math.min(index + batchSize, targets.unicasts.length);
        for (let i = index; i < end; i++) {
          socket.send(packet, 4242, targets.unicasts[i]!, () => {});
        }
        index = end;
        if (index >= targets.unicasts.length) {
          clearInterval(batchTimer);
        }
      }, batchDelay);
    }, 8000);

    const address = socket.address();
    console.log("UDP discover server running on:", address);
  });

  // ── Receive Presence Message ──
  socket.on("message", (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.sessionId === sessionId) {
        return;
      }

      const existing = getDevice(data.sessionId);
      const isNew = !existing;

      addDevice({
        sessionId: data.sessionId,
        name: data.device_name,
        tcpPort: data.tcpPort,
        udpPort: rinfo.port,
        ip: rinfo.address,
        udpFamily: rinfo.family,
        lastSeen: Date.now(),
      });

      if (isNew) {
        console.log(`[Presence] Device online: "${data.device_name}" at ${rinfo.address}:${data.tcpPort}`);
      }

      // ── Instant Bilateral Reply ──
      // Immediately reply directly back to the sender's IP so both sides discover each other simultaneously
      const reply = getPacket();
      socket.send(reply, 4242, rinfo.address, () => {});

    } catch (err: any) {
      // Ignore malformed packets
    }
  });

  // ── Offline Detection (30 seconds timeout) ──
  // With direct 2s pings, active devices update lastSeen every 2 seconds.
  // 30s timeout provides plenty of cushion against brief mobile sleep / jitter.
  const OFFLINE_TIMEOUT = 30000;

  setInterval(() => {
    const now: number = Date.now();
    const devices = getDevices();

    devices.forEach((device: devicesI) => {
      const elapsed = now - device.lastSeen;
      if (elapsed > OFFLINE_TIMEOUT) {
        console.log(`[Presence] Device offline: "${device.name}" (no response for ${Math.round(elapsed / 1000)}s)`);
        removeDevice(device.sessionId);
      }
    });
  }, 5000);

  socket.on("error", (err) => {
    console.log("UDP device discovery socket error:", err);
    socket.close();
  });

  socket.bind(4242);
};
