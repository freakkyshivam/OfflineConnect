import net from "node:net";
import { handleIncomingSocket, handleIncomingTcpData } from "./tcpClient.js";

/**
 * TCP server with newline-delimited JSON framing.
 *
 * Incoming bytes are buffered and split on "\n".
 * Any remaining buffered data is flushed when the connection ends.
 * Internal protocol control messages (handshake, handshake_ack, duplicate)
 * are handled internally so consumer onMessage only receives application data.
 */
export const startTcpServer = (
  port: number,
  onMessage: (data: string, socket: net.Socket) => void,
  onConnection?: (socket: net.Socket) => void,
) => {
  const server = net.createServer((socket) => {
    socket.setEncoding("utf-8");

    handleIncomingSocket(socket);
    onConnection?.(socket);

    let buffer = "";

    function processLine(line: string) {
      if (!line) return;
      try {
        const parsed = JSON.parse(line);
        if (
          parsed.type === "handshake" ||
          parsed.type === "handshake_ack" ||
          parsed.type === "duplicate"
        ) {
          handleIncomingTcpData(line, socket);
          return;
        }
        if (parsed.type === "chat") {
          handleIncomingTcpData(line, socket);
        }
      } catch {}
      onMessage(line, socket);
    }

    socket.on("data", (chunk: string) => {
      buffer += chunk;

      // Process all complete newline-delimited messages
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        processLine(line);
      }
    });

    // Flush remaining data on connection close (backward compat)
    socket.on("end", () => {
      if (buffer.length > 0) {
        processLine(buffer);
        buffer = "";
      }
    });

    socket.on("error", (err) => {
      console.log("TCP socket error:", err.message);
    });

    socket.on("close", () => {
      buffer = "";
    });
  });

  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      console.log(`TCP server listening on ${port}`);
    },
  );

  return server;
};
