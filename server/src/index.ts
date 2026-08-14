import {startDiscovery} from './discovery';
import { startTcpServer } from './tcpServer';
import { sendMessageToDevice } from './tcpClient';
import  {getDevices} from './deviceStore'

const TCP_PORT = 8080

startDiscovery(TCP_PORT)

    startTcpServer(TCP_PORT, "")

export const onMessage = (data : any, socket : any)=>{

}
