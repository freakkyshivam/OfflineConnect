import net from "node:net";
import { getDevice } from "./deviceStore";
import { devicesI } from "./types";

interface ChatMessage {
  senderName: string;
  senderSessionId: string;
  text: string;
  timestamp: number;
}

export function sendMessageToDevice(sessionId: string, message: ChatMessage) {
    const device: devicesI = getDevice(sessionId);

    if (!device) {
        console.log("Device not found or offline");
        return;
    }

    const payload = JSON.stringify({
        type: "chat",
        ...message,
    });

    const client = net.createConnection({ port: device.tcpPort, host: device.ip }, () => {
        client.write(payload);
        client.end();
    });

    client.on('error', (err) => {
        console.log(`Failed to reach ${device.name} : `, err.message);
    });
}
