import net from "node:net";

export const startTcpServer = (port: number, onMessage: (data: string, socket: net.Socket) => void) => {
  const server = net.createServer((socket) => {

     socket.setEncoding("utf-8");

    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log("Client connected : ", clientId);
    
    socket.on("data", (data) => {
      onMessage(data as string, socket);
    });

    socket.on("error", (err: any) => {
      console.log("TCP socket error ", err.message);
    });
  });

  server.listen({port, host : "0.0.0.0"}, ()=>{
    console.log(`TCP server listening on ${port}`);
  })

  return server;
};
