import net from "node:net";
import { onMessage } from "./index";

export const startTcpServer = (port: number, msg: any) => {
  const server = net.createServer((socket) => {

     socket.setEncoding("utf-8");

    const clinetId = `${socket.remoteAddress} : ${socket.remotePort}`

    console.log("Client connected : ", clinetId);
    
    socket.on("data", (data) => {
      onMessage(data, socket);
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
