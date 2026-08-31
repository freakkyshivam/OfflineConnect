import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WebSocketServer, WebSocket } from "ws";

import {
  startDiscovery,
  getSessionId,
  setDeviceName,
  getDeviceName,
} from "./discovery.js";

import { startTcpServer } from "./tcpServer.js";
import { sendMessageToDevice } from "./tcpClient.js";

import { getDevices, getDevice } from "./deviceStore.js";

import { devicesI } from "./types.js";

const TCP_PORT = 8080;
const HTTP_PORT = 3000;

 
// Static File Server


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

function findClientDir(): string {
  const candidates: string[] = [];

  try {
    const thisFile = fileURLToPath(import.meta.url);
    const thisDir = path.dirname(thisFile);

    candidates.push(path.resolve(thisDir, "..", "..", "client"));
  } catch {}

  try {
    if (typeof __dirname !== "undefined") {
      candidates.push(path.resolve(__dirname, "..", "..", "client"));
    }
  } catch {}

  candidates.push(path.resolve(process.cwd(), "..", "client"));

  candidates.push(path.resolve(process.cwd(), "client"));

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "index.html"))) {
        return dir;
      }
    } catch {}
  }

  console.error("Could not find client/ directory.");

  candidates.forEach((candidate) => {
    console.error(" -", candidate);
  });

  return candidates[0] ?? path.resolve(process.cwd(), "client");
}

const CLIENT_DIR = findClientDir();

console.log(`Static files: ${CLIENT_DIR}`);

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");

  urlPath = urlPath.split("?")[0] || "/index.html";
  urlPath = urlPath.split("#")[0] || "/index.html";

  try {
    urlPath = decodeURIComponent(urlPath);
  } catch {}

  const fullPath = path.resolve(path.join(CLIENT_DIR, urlPath));

  // Directory traversal protection
  if (!fullPath.startsWith(path.resolve(CLIENT_DIR))) {
    res.writeHead(403);
    res.end("Forbidden");

    return;
  }

  const ext = path.extname(fullPath);

  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log(`[404] ${urlPath} → ${fullPath}`);

      res.writeHead(404);
      res.end("Not found");

      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });

    res.end(data);
  });
});

 
// WebSocket
 

const wss = new WebSocketServer({
  server: httpServer,
});

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

  // Send own device information
  ws.send(
    JSON.stringify({
      type: "self_info",
      sessionId: getSessionId(),
      name: getDeviceName(),
    }),
  );

  // Send currently discovered devices
  ws.send(
    JSON.stringify({
      type: "device_list",
      devices: buildDeviceArray(),
    }),
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "set_name": {
          setDeviceName(msg.name);

          broadcast({
            type: "self_info",
            sessionId: getSessionId(),
            name: getDeviceName(),
          });

          console.log(`Display name set to: ${msg.name}`);

          break;
        }

        case "send_message": {
          const timestamp = Date.now();

          sendMessageToDevice(msg.sessionId, {
            senderName: getDeviceName(),
            senderSessionId: getSessionId(),
            text: msg.text,
            timestamp,
          });

          ws.send(
            JSON.stringify({
              type: "message_sent",
              to: msg.sessionId,
              text: msg.text,
              timestamp,
            }),
          );

          break;
        }
      }
    } catch (err) {
      console.log(
        "Invalid WebSocket message:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  ws.on("close", () => {
    browserClients.delete(ws);

    console.log("Browser client disconnected");
  });
});

// Update browser device list periodically
setInterval(() => {
  broadcast({
    type: "device_list",
    devices: buildDeviceArray(),
  });
}, 2000);


// Start UDP + TCP


startDiscovery(TCP_PORT);

startTcpServer(TCP_PORT, (data: string) => {
  try {
    const msg = JSON.parse(data);

    if (msg.type === "chat") {
      console.log(`Message from ${msg.senderName}: ${msg.text}`);

      // Sender ki lastSeen update karo
      const sender = getDevice(msg.senderSessionId);

      if (sender) {
        sender.lastSeen = Date.now();
      }

      // Browser ko incoming message bhejo
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
  } catch {
    console.log(`Received raw TCP data: ${data}`);
  }
});
 
// HTTP Server
 

httpServer.listen(HTTP_PORT, () => {
  console.log("\nOfflineConnect is running!");

  console.log(`Open http://localhost:${HTTP_PORT}`);
});
