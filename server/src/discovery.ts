import dgram from "node:dgram";
import { addDevice, removeDevice, getDevice, getDevices } from "./deviceStore";
import { devicesI } from "./types";

import crypto from "node:crypto";
import os from "node:os";

// Shared state: sessionId and device name 
const sessionId = crypto.randomUUID();
let deviceName = os.hostname() ?? "Desktop";

export function getSessionId(): string {
  return sessionId;
}

export function setDeviceName(name: string) {
  deviceName = name;
}

export function getDeviceName(): string {
  return deviceName;
}

// Discovery (UDP broadcast + presence) 
export const startDiscovery = (TCP_PORT: number) => {
  const socket = dgram.createSocket("udp4");

  socket.on("listening", () => {
    socket.setBroadcast(true);

    // Broadcast presence every 3 seconds
    // Packet is constructed fresh each interval so name changes take effect immediately
    setInterval(() => {
      const presencePacket = {
        type: "PRESENCE",
        device_name: deviceName,
        sessionId,
        tcpPort: TCP_PORT,
      };

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
      const data = JSON.parse(msg.toString());

      if (data.sessionId == sessionId) {
        return;
      }

      addDevice({
        sessionId: data.sessionId,
        name: data.device_name,
        tcpPort: data.tcpPort,
        udpPort: rinfo.port,
        ip: rinfo.address,
        udpFamily: rinfo.family,
        lastSeen: Date.now(),
      });
    } catch (err: any) {
      console.log("Invalid data : ", err.message);
    }
  });

  // Timeout check — remove devices that haven't broadcast in 6 seconds
  setInterval(() => {
    const now: number = Date.now();
    const devices = getDevices();

    devices.forEach((device: devicesI) => {
      if (Number(now - device.lastSeen) > 6000) {
        console.log(`${device.name} went offline`);
        removeDevice(device.sessionId);
      }
    });
  }, 3000);

  socket.on("error", (err) => {
    console.log("UDP device discovery socket error : ", err);
    socket.close();
  });

  socket.bind(4242);
};
