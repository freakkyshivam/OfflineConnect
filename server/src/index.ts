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
import {
  sendMessageToDevice,
  connectToPeer,
  disconnectPeer,
  disconnectAllPeers,
  getPeerState,
  onPeerStateChange,
} from "./tcpClient.js";

import { getDevices, getDevice } from "./deviceStore.js";
import { devicesI } from "./types.js";

const DEFAULT_TCP_PORT = 8080;
const DEFAULT_HTTP_PORT = 3000;

// ─── Static File Server ─────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

export function findClientDir(): string {
  const candidates: string[] = [];

  // 1. Packaged Electron resources
  const resourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    candidates.push(path.join(resourcesPath, "client"));
    candidates.push(path.join(resourcesPath, "app", "client"));
  }

  // 2. Relative to current file URL
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const thisDir = path.dirname(thisFile);
    candidates.push(path.resolve(thisDir, "..", "..", "client"));
    candidates.push(path.resolve(thisDir, "..", "client"));
  } catch {}

  // 3. Relative to __dirname if available
  try {
    if (typeof __dirname !== "undefined") {
      candidates.push(path.resolve(__dirname, "..", "..", "client"));
      candidates.push(path.resolve(__dirname, "..", "client"));
    }
  } catch {}

  // 4. Relative to current working directory
  candidates.push(path.resolve(process.cwd(), "..", "client"));
  candidates.push(path.resolve(process.cwd(), "client"));

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, "dist", "index.html"))) {
        return path.join(dir, "dist");
      }
      if (fs.existsSync(path.join(dir, "index.html"))) {
        return dir;
      }
    } catch {}
  }

  console.error("Could not find client/ directory. Checked candidates:");
  candidates.forEach((candidate) => {
    console.error(" -", candidate);
  });

  return candidates[0] ?? path.resolve(process.cwd(), "client");
}

export interface BackendInstance {
  httpPort: number;
  tcpPort: number;
  stop: () => Promise<void>;
}

export interface BackendConfig {
  httpPort?: number;
  tcpPort?: number;
  clientDir?: string;
}

/**
 * Start all OfflineConnect backend services (HTTP, WebSocket, UDP Discovery, TCP Server).
 * Can be run standalone or embedded within Electron main process.
 */
export function startBackend(config: BackendConfig = {}): Promise<BackendInstance> {
  return new Promise((resolve, reject) => {
    const httpPort = config.httpPort ?? DEFAULT_HTTP_PORT;
    const tcpPort = config.tcpPort ?? DEFAULT_TCP_PORT;
    let clientDir = config.clientDir ?? findClientDir();

    // If clientDir contains a Vite production build in dist/, serve dist/ instead of source
    if (fs.existsSync(path.join(clientDir, "dist", "index.html"))) {
      clientDir = path.join(clientDir, "dist");
    }

    console.log(`Static files: ${clientDir}`);

    const httpServer = http.createServer((req, res) => {
      let urlPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");

      urlPath = urlPath.split("?")[0] || "/index.html";
      urlPath = urlPath.split("#")[0] || "/index.html";

      try {
        urlPath = decodeURIComponent(urlPath);
      } catch {}

      const fullPath = path.resolve(path.join(clientDir, urlPath));

      // Directory traversal protection
      if (!fullPath.startsWith(path.resolve(clientDir))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

      fs.readFile(fullPath, (err, data) => {
        if (err) {
          // If requesting an SPA route without a file extension, fallback to index.html
          if (!ext && fs.existsSync(path.join(clientDir, "index.html"))) {
            fs.readFile(path.join(clientDir, "index.html"), (err2, indexData) => {
              if (err2) {
                res.writeHead(404);
                res.end("Not found");
              } else {
                res.writeHead(200, {
                  "Content-Type": "text/html; charset=utf-8",
                  "Cache-Control": "no-cache",
                });
                res.end(indexData);
              }
            });
            return;
          }
          console.log(`[404] ${urlPath} → ${fullPath}`);
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const isHashedAsset = urlPath.startsWith("/assets/");
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        });

        res.end(data);
      });
    });

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
      const mySessionId = getSessionId();

      devices.forEach((device: devicesI) => {
        if (device.sessionId === mySessionId) return;

        list.push({
          sessionId: device.sessionId,
          name: device.name,
          ip: device.ip,
          tcpPort: device.tcpPort,
          online: device.online,
          connectionState: getPeerState(device.sessionId),
        });
      });

      return list;
    }

    function broadcastDeviceList() {
      broadcast({
        type: "device_list",
        devices: buildDeviceArray(),
      });
    }

    const unsubPeerState = onPeerStateChange((sessionId, state, error) => {
      broadcast({
        type: "peer_state",
        sessionId,
        state,
        error,
      });
    });

    wss.on("connection", (ws) => {
      browserClients.add(ws);

      ws.send(
        JSON.stringify({
          type: "self_info",
          sessionId: getSessionId(),
          name: getDeviceName(),
        }),
      );

      ws.send(
        JSON.stringify({
          type: "device_list",
          devices: buildDeviceArray(),
        }),
      );

      ws.on("message", async (raw) => {
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
              broadcastDeviceList();
              console.log(`Display name set to: ${msg.name}`);
              break;
            }

            case "connect_peer": {
              if (typeof msg.sessionId === "string") {
                await connectToPeer(msg.sessionId);
              }
              break;
            }

            case "disconnect_peer": {
              if (typeof msg.sessionId === "string") {
                disconnectPeer(msg.sessionId);
              }
              break;
            }

            case "send_message": {
              const timestamp = Date.now();
              const targetSessionId = msg.sessionId;
              const text = msg.text;
              const msgId = msg.id ?? crypto.randomUUID();

              const success = await sendMessageToDevice(targetSessionId, {
                id: msgId,
                senderName: getDeviceName(),
                senderSessionId: getSessionId(),
                text,
                timestamp,
              });

              ws.send(
                JSON.stringify({
                  type: success ? "message_sent" : "message_failed",
                  id: msgId,
                  to: targetSessionId,
                  text,
                  timestamp,
                  error: success
                    ? undefined
                    : "Peer is offline or connection failed",
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
      });
    });

    const broadcastInterval = setInterval(() => {
      broadcastDeviceList();
    }, 2000);

    // UDP Discovery
    const discovery = startDiscovery(tcpPort, () => {
      broadcastDeviceList();
    });

    // TCP Chat Server
    const tcpServer = startTcpServer(tcpPort, (data: string) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === "chat") {
          console.log(`Message from ${msg.senderName}: ${msg.text}`);

          const sender = getDevice(msg.senderSessionId);
          if (sender) {
            sender.lastSeen = Date.now();
            sender.online = true;
          }

          broadcast({
            type: "incoming_message",
            id: msg.id,
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

    httpServer.on("error", (err) => {
      console.error(`HTTP server error on port ${httpPort}:`, err.message);
      reject(err);
    });

    httpServer.listen(httpPort, () => {
      console.log(`OfflineConnect HTTP server listening on port ${httpPort}`);
      console.log(`Open http://localhost:${httpPort}`);

      const stop = async (): Promise<void> => {
        clearInterval(broadcastInterval);
        unsubPeerState();

        for (const client of browserClients) {
          try {
            client.terminate();
          } catch {}
        }
        browserClients.clear();

        await new Promise<void>((r) => wss.close(() => r()));
        await new Promise<void>((r) => httpServer.close(() => r()));

        try {
          discovery.cleanup();
          discovery.socket.close();
        } catch {}

        try {
          tcpServer.close();
        } catch {}

        disconnectAllPeers();
        console.log("OfflineConnect backend stopped cleanly.");
      };

      resolve({
        httpPort,
        tcpPort,
        stop,
      });
    });
  });
}

// ─── Direct execution entry point ───────────────────────────────────

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js")) &&
  !process.env.OFFLINECONNECT_NO_AUTOSTART;

if (isDirectExecution) {
  startBackend().catch((err) => {
    console.error("Failed to start OfflineConnect backend:", err);
    process.exit(1);
  });
}
