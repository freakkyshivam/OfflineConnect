import net from "node:net";

/**
 * TCP server with newline-delimited JSON framing.
 *
 * Bug #2 fix: TCP is a byte stream.  A single write() can be split
 * across multiple "data" events, and multiple writes can coalesce
 * into one "data" event.  We buffer incoming bytes and split on "\n".
 *
 * For backward compatibility with senders that don't append "\n",
 * any remaining buffered data is flushed when the connection ends.
 */
export const startTcpServer = (
  port: number,
  onMessage: (data: string, socket: net.Socket) => void,
) => {
  const server = net.createServer((socket) => {
    socket.setEncoding("utf-8");

    let buffer = "";

    socket.on("data", (chunk: string) => {
      buffer += chunk;

      // Process all complete newline-delimited messages
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        if (line.length > 0) {
          onMessage(line, socket);
        }
      }
    });

    // Flush remaining data on connection close (backward compat)
    socket.on("end", () => {
      if (buffer.length > 0) {
        onMessage(buffer, socket);
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
