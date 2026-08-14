import net from "node:net";
import { getDevice } from "./deviceStore";
import { devicesI } from "./types";

export function sendMessageTODevice(sessionId : string, msg : string){
    const device:devicesI = getDevice(sessionId);

    if(!device){
        console.log("Device not found or offline");
        return;
    }

    const client = net.createConnection({port : device.tcpPort, host : device.udpAddress}, ()=>{
        client.write(msg);
        client.end();
    })

    client.on('error', (err)=>{
        console.log(`Failed to reach ${device.name} : `,err.message);
        
    })
}

