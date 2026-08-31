import dgram from "node:dgram";
import crypto from "node:crypto";

import { addDevice } from "./deviceStore.js";

const DISCOVERY_PORT = 4242;
const sessionId = crypto.randomUUID();
let deviceName = process.env.COMPUTERNAME || process.env.HOSTNAME || "OfflineConnect device";

export function getSessionId(): string {
    return sessionId;
}

export function getDeviceName(): string {
    return deviceName;
}

export function setDeviceName(name: unknown): void {
    if (typeof name !== "string") {
        return;
    }

    const normalizedName = name.trim();
    if (normalizedName) {
        deviceName = normalizedName.slice(0, 80);
    }
}

export function startDiscovery(tcpPort: number) {

    const socket = dgram.createSocket("udp4");

    socket.on("listening", () => {

        socket.setBroadcast(true);

        setInterval(() => {
            const message = JSON.stringify({
                type: "ANNOUNCE",
                sessionId,
                name: deviceName,
                tcpPort,
            });

            socket.send(
                message,
                DISCOVERY_PORT,
                "255.255.255.255"
            );

        }, 3000);

        console.log("UDP discovery started");
    });


    socket.on("message", (msg, rinfo) => {
        let data: { sessionId?: unknown; name?: unknown; tcpPort?: unknown };

        try {
            data = JSON.parse(msg.toString());
        } catch {
            return;
        }

        if (
            typeof data.sessionId !== "string" ||
            typeof data.tcpPort !== "number" ||
            !Number.isInteger(data.tcpPort) ||
            data.tcpPort < 1 ||
            data.tcpPort > 65535 ||
            data.sessionId === sessionId
        ) {
            return;
        }

        const device = {
            sessionId: data.sessionId,
            name: typeof data.name === "string" && data.name.trim()
                ? data.name.trim().slice(0, 80)
                : "OfflineConnect device",
            ip: rinfo.address,
            tcpPort: data.tcpPort,
            udpPort: rinfo.port,
            udpFamily: rinfo.family,
            lastSeen: Date.now()
        };

        addDevice(device);

        console.log(
            `Device found: ${device.ip}:${device.tcpPort}`
        );
    });


    socket.bind(DISCOVERY_PORT);
}
