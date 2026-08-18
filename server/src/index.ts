import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";

import { startDiscovery, getSessionId, setDeviceName, getDeviceName } from "./discovery";
import { startTcpServer } from "./tcpServer";
import { sendMessageToDevice } from "./tcpClient";
import { getDevices } from "./deviceStore";
import { devicesI } from "./types";

const TCP_PORT = 8080;
const HTTP_PORT = 3000;

// Static File Server 
// Serves the client/ folder so the browser can load index.html, styles.css, app.js

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// client/ is two levels up from server/src/
const CLIENT_DIR = path.join(process.cwd(), "..", "client");

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url === "/" ? "/index.html" : (req.url || "/index.html");

  // Strip query strings
  urlPath = urlPath.split("?")[0]!;

  const fullPath = path.resolve(path.join(CLIENT_DIR, urlPath));

  // Security: prevent directory traversal
  if (!fullPath.startsWith(path.resolve(CLIENT_DIR))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

// ─── WebSocket Server ────────────────────────────────────────────────
// Bridge between the browser UI and the TCP/UDP networking layer

const wss = new WebSocketServer({ server: httpServer });
const browserClients = new Set<WebSocket>();

function broadcast(data: object) {
  const json = JSON.stringify(data);
  for (const client of browserClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

function buildDeviceArray() {
  const devices = getDevices();
  const list: object[] = [];
  devices.forEach((device: devicesI) => {
    list.push({
      sessionId: device.sessionId,
      name: device.name,
      ip: device.ip,
      tcpPort: device.tcpPort,
    });
  });
  return list;
}

wss.on("connection", (ws) => {
  browserClients.add(ws);
  console.log("Browser client connected");

  // Send self info so the UI knows who "we" are
  ws.send(JSON.stringify({
    type: "self_info",
    sessionId: getSessionId(),
    name: getDeviceName(),
  }));

  // Send current device list immediately
  ws.send(JSON.stringify({
    type: "device_list",
    devices: buildDeviceArray(),
  }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "set_name":
          setDeviceName(msg.name);
          // Echo updated self info to all browser tabs
          broadcast({
            type: "self_info",
            sessionId: getSessionId(),
            name: msg.name,
          });
          console.log(`Display name set to: ${msg.name}`);
          break;

        case "send_message": {
          const timestamp = Date.now();
          sendMessageToDevice(msg.sessionId, {
            senderName: getDeviceName(),
            senderSessionId: getSessionId(),
            text: msg.text,
            timestamp,
          });
          // Confirm back to the sender's browser
          ws.send(JSON.stringify({
            type: "message_sent",
            to: msg.sessionId,
            text: msg.text,
            timestamp,
          }));
          break;
        }
      }
    } catch (err: any) {
      console.log("Invalid WebSocket message:", err.message);
    }
  });

  ws.on("close", () => {
    browserClients.delete(ws);
    console.log("Browser client disconnected");
  });
});

// Push updated device list to all browser clients every 2 seconds
setInterval(() => {
  broadcast({
    type: "device_list",
    devices: buildDeviceArray(),
  });
}, 2000);

// ─── Start Services ──────────────────────────────────────────────────

startDiscovery(TCP_PORT);

startTcpServer(TCP_PORT, (data: string) => {
  try {
    const msg = JSON.parse(data);
    if (msg.type === "chat") {
      console.log(`Message from ${msg.senderName}: ${msg.text}`);

      // Forward to all browser clients
      broadcast({
        type: "incoming_message",
        from: {
          sessionId: msg.senderSessionId,
          name: msg.senderName,
        },
        text: msg.text,
        timestamp: msg.timestamp,
      });
    }
  } catch (err: any) {
    // Non-JSON data from older/incompatible clients
    console.log(`Received raw TCP data: ${data}`);
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`\n  OfflineConnect is running!`);
  console.log(`  Open http://localhost:${HTTP_PORT} in your browser\n`);
});