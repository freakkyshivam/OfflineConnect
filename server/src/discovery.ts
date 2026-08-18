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
// Compute all addresses we should send discovery packets to.
// This makes discovery work on:
//   - Wired LAN (broadcast works)
//   - WiFi router (broadcast usually works)
//   - Mobile hotspot (broadcast is usually BLOCKED → unicast fallback)

function getDiscoveryTargets(): { broadcasts: string[]; unicasts: string[] } {
  const broadcasts = new Set<string>();
  broadcasts.add("255.255.255.255"); // limited broadcast — always try

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

      // Subnet-directed broadcast (e.g. 192.168.43.255 for a /24)
      // Some networks pass this even when they block 255.255.255.255
      const bcast = ip.map((octet, i) => octet | (~(mask[i]!) & 255));
      broadcasts.add(bcast.join("."));

      // For subnets where the first 3 octets are fully masked (/24 or smaller),
      // generate unicast targets — one for every possible host in the subnet.
      // This is the fallback that makes discovery work on mobile hotspots
      // where broadcast is blocked by client isolation.
      //
      // Covers:  /24 (255.255.255.0)   → 254 hosts (Android hotspot, typical LAN)
      //          /28 (255.255.255.240) →  14 hosts (iOS hotspot)
      //          /27 (255.255.255.224) →  30 hosts
      if (mask[0] === 255 && mask[1] === 255 && mask[2] === 255) {
        const networkBase = ip[3]! & mask[3]!;     // e.g. 0 for /24
        const hostMax = ~mask[3]! & 255;           // e.g. 255 for /24, 15 for /28
        const prefix = `${ip[0]}.${ip[1]}.${ip[2]}`;

        // Skip network address (h=0) and broadcast address (h=hostMax)
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

// ─── Discovery (UDP broadcast + unicast scan + presence) ─────────────
export const startDiscovery = (TCP_PORT: number) => {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  socket.on("listening", () => {
    socket.setBroadcast(true);

    // Log what targets we'll use
    const initialTargets = getDiscoveryTargets();
    console.log("Broadcast targets:", initialTargets.broadcasts);
    console.log("Unicast scan:", initialTargets.unicasts.length, "addresses");

    // Send presence every 3 seconds to ALL discovery targets
    // Packet is constructed fresh each interval so name changes take effect immediately
    setInterval(() => {
      const presencePacket = JSON.stringify({
        type: "PRESENCE",
        device_name: deviceName,
        sessionId,
        tcpPort: TCP_PORT,
      });

      // Re-compute targets each cycle (network interfaces can change)
      const targets = getDiscoveryTargets();

      // 1. Broadcast to all broadcast addresses
      for (const addr of targets.broadcasts) {
        socket.send(presencePacket, 4242, addr, (err) => {
          // Silently ignore expected errors (permission denied, network unreachable)
          if (err && err.message && !err.message.includes("EPERM") && !err.message.includes("ENETUNREACH") && !err.message.includes("EACCES")) {
            console.log(`Broadcast error (${addr}):`, err.message);
          }
        });
      }

      // 2. Unicast to every host in the subnet (hotspot fallback)
      // This is what makes discovery work when broadcast is blocked
      for (const addr of targets.unicasts) {
        socket.send(presencePacket, 4242, addr, () => {
          // Silently ignore errors — most IPs won't have the app running
        });
      }
    }, 3000);

    const address = socket.address();
    console.log("UDP discover server running on:", address);
  });

  socket.on("message", (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.sessionId == sessionId) {
        return;
      }

      addDevice({
        sessionId: data.sessionId,
        name: data.device_name,
        tcpPort: data.tcpPort,
        udpPort: rinfo.port,
        ip: rinfo.address,
        udpFamily: rinfo.family,
        lastSeen: Date.now(),
      });
    } catch (err: any) {
      console.log("Invalid data : ", err.message);
    }
  });

  // Timeout check — remove devices that haven't broadcast in 6 seconds
  setInterval(() => {
    const now: number = Date.now();
    const devices = getDevices();

    devices.forEach((device: devicesI) => {
      if (Number(now - device.lastSeen) > 6000) {
        console.log(`${device.name} went offline`);
        removeDevice(device.sessionId);
      }
    });
  }, 3000);

  socket.on("error", (err) => {
    console.log("UDP device discovery socket error : ", err);
    socket.close();
  });

  socket.bind(4242);
};
