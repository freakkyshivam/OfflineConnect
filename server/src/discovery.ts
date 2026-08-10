import dgram from "node:dgram";
import { addDevice, removeDevice, getDevice, getDevices } from "./deviceStore";
import { devicesI } from "./types";

import crypto from "node:crypto";
import os from "node:os";
import { toBuffer } from "node:ffi";

const TCP_PORT = 8080;

export const startDiscovery = () => {
  const socket = dgram.createSocket("udp4");

  const sessionId = crypto.randomUUID();

  socket.on("listening", () => {
    socket.setBroadcast(true);

    const presencePacket = {
      type: "PRESENCE",
      devie_name: os.hostname() ?? "Desktop",
      sessionId,
      tcpPort: TCP_PORT,
    };

    setInterval(() => {
      socket.send(
        JSON.stringify(presencePacket),
        4242,
        "255.255.255.255",
        (err: any) => {
          if (err) {
            console.log("Presence msg sending error : ", err);
          }
        },
      );
    }, 3000);

    const address = socket.address();
    console.log("UDP discover server running on : ", address);
  });

  socket.on("message", (msg, rinfo) => {
    try {

      const data = JSON.parse(msg);

      if (data.sessionId == sessionId) {
        return;
      }

      addDevice({
        sessionId : data.sessionId,
        tcpPort : data.tcpPort,
        udpPort : rinfo.port,
        udpAddress : rinfo.address,
        udpFamily : rinfo.family,
        lastSeen : new Date(),
      })
    } catch (err : any) {
        console.log("Invalid data : ", err.message);
    }
  });

  setInterval(() => {
    const now = new Date();

    const  devices = getDevices();

    devices.forEach(device =>{
        if (now - device.lastSeen > 6000) {
      console.log(`${device.sessionId} offline`);
      removeDevice(device.sessionId);
    }
    })
  }, 3000);

  socket.on("error", (err) => {
  console.log("UDP device discovery socket error : ", err);
  socket.close();
});

socket.bind(4242);
};
