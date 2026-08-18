import net from "node:net";
import { getDevice } from "./deviceStore";
import { devicesI } from "./types";

interface ChatMessage {
  senderName: string;
  senderSessionId: string;
  text: string;
  timestamp: number;
}

export function sendMessageToDevice(sessionId: string, message: ChatMessage): Promise<boolean> {
  return new Promise((resolve) => {
    const device: devicesI | undefined = getDevice(sessionId);

    if (!device) {
      console.log(`[TCP Send] Device not found or offline for session: ${sessionId}`);
      resolve(false);
      return;
    }

    const payload = JSON.stringify({
      type: "chat",
      ...message,
    });

    const cleanIp = device.ip.replace(/^::ffff:/, '');
    console.log(`[TCP Send] Connecting to ${device.name} at ${cleanIp}:${device.tcpPort}...`);

    const client = net.createConnection({ port: device.tcpPort, host: cleanIp, timeout: 5000 }, () => {
      device.lastSeen = Date.now();
      client.write(payload, () => {
        console.log(`[TCP Send] Message successfully delivered to ${device.name}`);
        client.end();
        resolve(true);
      });
    });

    client.on('timeout', () => {
      console.log(`[TCP Send] Connection timed out reaching ${device.name} (${cleanIp}:${device.tcpPort})`);
      client.destroy();
      resolve(false);
    });

    client.on('error', (err) => {
      console.log(`[TCP Send] Failed to reach ${device.name} (${cleanIp}:${device.tcpPort}):`, err.message);
      resolve(false);
    });
  });
}
