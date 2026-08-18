import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

import { startDiscovery, getSessionId, setDeviceName, getDeviceName } from "./discovery";
import { startTcpServer } from "./tcpServer";
import { sendMessageToDevice } from "./tcpClient";
import { getDevices } from "./deviceStore";
import { devicesI } from "./types";

const TCP_PORT = 8080;
const HTTP_PORT = 3000;

// ─── Static File Server ──────────────────────────────────────────────
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

// Find the client/ directory using multiple strategies so it works
// on Windows, Linux, macOS, AND Termux regardless of which folder you run from.
function findClientDir(): string {
  const candidates: string[] = [];

  // Strategy 1: relative to THIS source file (most reliable)
  // server/src/index.ts → ../../client
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const thisDir = path.dirname(thisFile);
    candidates.push(path.resolve(thisDir, "..", "..", "client"));
  } catch {}

  // Strategy 2: __dirname (available in CJS mode / tsx)
  try {
    if (typeof __dirname !== "undefined") {
      candidates.push(path.resolve(__dirname, "..", "..", "client"));
    }
  } catch {}

  // Strategy 3: relative to cwd (assumes running from server/)
  candidates.push(path.resolve(process.cwd(), "..", "client"));

  // Strategy 4: relative to cwd (assumes running from project root)
  candidates.push(path.resolve(process.cwd(), "client"));

  // Pick the first one that actually exists and contains index.html
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "index.html"))) {
        return dir;
      }
    } catch {}
  }

  // Fallback: log all candidates so the user can debug
  console.error("Could not find client/ directory. Searched:");
  candidates.forEach((c) => console.error("  -", c));
  return candidates[0] || path.resolve(process.cwd(), "client");
}

const CLIENT_DIR = findClientDir();
console.log(`Static files: ${CLIENT_DIR}`);

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url === "/" ? "/index.html" : (req.url || "/index.html");

  // Strip query strings and hash
  urlPath = urlPath.split("?")[0] || "/index.html";
  urlPath = urlPath.split("#")[0] || "/index.html";

  // Decode URI components (%20 → space, etc.)
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch {}

  const fullPath = path.resolve(path.join(CLIENT_DIR, urlPath));

  // Security: prevent directory traversal
  if (!fullPath.startsWith(path.resolve(CLIENT_DIR))) {
    console.log(`[403] ${urlPath} (directory traversal blocked)`);
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log(`[404] ${urlPath} → ${fullPath}`);
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    console.log(`[200] ${urlPath} (${contentType})`);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
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