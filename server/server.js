// ============================================================
//  OfflineConnect — Backend Server
//  UDP Discovery + TCP Messaging + WebSocket Bridge to Frontend
// ============================================================
//
//  Usage:
//    node server.js                     → uses OS hostname
//    node server.js "Aarav-Laptop"      → custom device name
//
//  Architecture (per device):
//    ┌──────────────────────────────────────────────────┐
//    │                  This Server                     │
//    │                                                  │
//    │  UDP :41234  ←→  broadcast discovery (presence)  │
//    │  TCP :41235  ←→  direct messaging (peer-to-peer) │
//    │  WS  :3001   ←→  frontend bridge (localhost)     │
//    └──────────────────────────────────────────────────┘
// ============================================================

const dgram = require("dgram");
const net = require("net");
const os = require("os");
const { WebSocketServer } = require("ws");

// ── Configuration ──────────────────────────────────────────
const UDP_PORT = 41234;
const TCP_PORT = parseInt(process.env.TCP_PORT, 10) || 41235;
const WS_PORT = parseInt(process.env.WS_PORT, 10) || 3001;
const BROADCAST_ADDR = "255.255.255.255";
const BROADCAST_INTERVAL = 2000; // ms
const DEVICE_TIMEOUT = 6000; // mark offline after 6s of silence

// ── Device Identity ────────────────────────────────────────
const DEVICE_NAME = process.argv[2] || os.hostname();

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

const localIPs = getLocalIPs();
const selfId = localIPs.length > 0 ? `${localIPs[0]}:${TCP_PORT}` : `localhost:${TCP_PORT}`;

// ── State ──────────────────────────────────────────────────
const discoveredDevices = new Map(); // key: "ip:tcpPort" → device info
let wsClients = [];

// ============================================================
//  1. UDP DISCOVERY (broadcast presence, listen for others)
// ============================================================
const udpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

udpSocket.on("error", (err) => {
  console.error("[UDP] Socket error:", err.message);
});

udpSocket.bind(UDP_PORT, () => {
  udpSocket.setBroadcast(true);

  // Broadcast our presence every 2 seconds
  setInterval(() => {
    const packet = JSON.stringify({
      type: "presence",
      name: DEVICE_NAME,
      tcpPort: TCP_PORT,
    });
    const buf = Buffer.from(packet);
    udpSocket.send(buf, 0, buf.length, UDP_PORT, BROADCAST_ADDR, (err) => {
      if (err) console.error("[UDP] Broadcast error:", err.message);
    });
  }, BROADCAST_INTERVAL);

  console.log(`[UDP] Broadcasting presence every ${BROADCAST_INTERVAL / 1000}s on port ${UDP_PORT}`);
});

// Listen for presence packets from other devices
udpSocket.on("message", (msg, rinfo) => {
  try {
    const data = JSON.parse(msg.toString());
    if (data.type !== "presence") return;

    const deviceId = `${rinfo.address}:${data.tcpPort}`;

    // Ignore our own broadcasts (compare full id so same-machine testing works)
    if (deviceId === selfId) return;
    const isNew = !discoveredDevices.has(deviceId);

    discoveredDevices.set(deviceId, {
      id: deviceId,
      name: data.name,
      ip: rinfo.address,
      tcpPort: data.tcpPort,
      status: "online",
      lastSeen: Date.now(),
    });

    if (isNew) {
      console.log(`[Discovery] ✅ New device: ${data.name} (${rinfo.address}:${data.tcpPort})`);
      broadcastDeviceList();
    }
  } catch (_) {
    // Ignore non-JSON or malformed packets
  }
});

// Periodically check for timed-out devices
setInterval(() => {
  let changed = false;
  const now = Date.now();

  for (const [id, device] of discoveredDevices) {
    if (now - device.lastSeen > DEVICE_TIMEOUT) {
      console.log(`[Discovery] ❌ Device offline: ${device.name} (${device.ip})`);
      discoveredDevices.delete(id);
      changed = true;
    }
  }

  if (changed) broadcastDeviceList();
}, DEVICE_TIMEOUT / 2);

// ============================================================
//  2. TCP MESSAGING (receive messages from other devices)
// ============================================================
const tcpServer = net.createServer((conn) => {
  let buffer = "";

  conn.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep any incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.type === "chat") {
          console.log(`[TCP] 💬 Message from ${data.fromName}: "${data.content}"`);

          // Forward to all connected frontends
          const wsMsg = JSON.stringify({
            type: "message",
            deviceId: data.fromId,
            message: {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              senderId: data.fromId,
              receiverId: selfId,
              content: data.content,
              timestamp: data.timestamp || Date.now(),
            },
          });

          for (const ws of wsClients) {
            ws.send(wsMsg);
          }
        }
      } catch (e) {
        console.error("[TCP] Parse error:", e.message);
      }
    }
  });

  conn.on("error", (err) => {
    console.error("[TCP] Connection error:", err.message);
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`[TCP] Listening for messages on port ${TCP_PORT}`);
});

// Send a chat message to a specific device via TCP
function sendTCPMessage(targetIp, targetPort, content) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(targetPort, targetIp, () => {
      const msg =
        JSON.stringify({
          type: "chat",
          fromId: selfId,
          fromName: DEVICE_NAME,
          content,
          timestamp: Date.now(),
        }) + "\n";

      client.write(msg, () => {
        client.end();
        resolve();
      });
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error("Connection timed out"));
    });

    client.on("error", (err) => {
      reject(err);
    });
  });
}

// ============================================================
//  3. WEBSOCKET SERVER (bridge between backend ↔ frontend)
// ============================================================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
  console.log("[WS] 🌐 Frontend connected");
  wsClients.push(ws);

  // Send the device's own identity
  ws.send(
    JSON.stringify({
      type: "identity",
      id: selfId,
      name: DEVICE_NAME,
    })
  );

  // Send current list of discovered devices
  ws.send(
    JSON.stringify({
      type: "devices",
      devices: Array.from(discoveredDevices.values()),
    })
  );

  // Handle messages from the frontend
  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "send") {
        const device = discoveredDevices.get(msg.to);
        if (device) {
          try {
            await sendTCPMessage(device.ip, device.tcpPort, msg.content);
            console.log(`[WS] → Sent to ${device.name}: "${msg.content}"`);
          } catch (err) {
            console.error(`[WS] ✗ Failed to send to ${device.name}:`, err.message);
          }
        } else {
          console.error(`[WS] ✗ Device not found: ${msg.to}`);
        }
      }
    } catch (e) {
      console.error("[WS] Error:", e.message);
    }
  });

  ws.on("close", () => {
    wsClients = wsClients.filter((c) => c !== ws);
    console.log("[WS] Frontend disconnected");
  });

  ws.on("error", (err) => {
    console.error("[WS] Client error:", err.message);
  });
});

// Broadcast updated device list to all frontends
function broadcastDeviceList() {
  const msg = JSON.stringify({
    type: "devices",
    devices: Array.from(discoveredDevices.values()),
  });

  for (const ws of wsClients) {
    ws.send(msg);
  }
}

// ============================================================
//  Startup Banner
// ============================================================
console.log("");
console.log("╔══════════════════════════════════════════╗");
console.log("║        OfflineConnect  —  Backend        ║");
console.log("╠══════════════════════════════════════════╣");
console.log(`║  Device:    ${DEVICE_NAME.padEnd(28)}║`);
console.log(`║  IPs:       ${(localIPs.join(", ") || "none").padEnd(28)}║`);
console.log(`║  UDP Port:  ${String(UDP_PORT).padEnd(28)}║`);
console.log(`║  TCP Port:  ${String(TCP_PORT).padEnd(28)}║`);
console.log(`║  WS Port:   ${String(WS_PORT).padEnd(28)}║`);
console.log("╚══════════════════════════════════════════╝");
console.log("");
console.log("Waiting for devices on the network...");
console.log("");
