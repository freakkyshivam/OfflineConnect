
import { type devicesI} from './types'

const discoveredDevices = new Map();

// add ne w device
export function addDevice(device : devicesI) {
  discoveredDevices.set(device.sessionId, device);
}


// remove device by sessionId
export function removeDevice(sessionId : string) {
  discoveredDevices.delete(sessionId);
}

// get device by session id
export function getDevice(sessionId : string) {
  return discoveredDevices.get(sessionId);
}

// get all device
export function getDevices() {
  return discoveredDevices;
}

 