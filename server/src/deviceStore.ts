import { type devicesI } from './types';

const discoveredDevices = new Map<string, devicesI>();

// Add or update device
export function addDevice(device: devicesI) {
  // Normalize IP
  const cleanIp = device.ip.replace(/^::ffff:/, '');
  const normalizedDevice = { ...device, ip: cleanIp };

  // Remove any stale session for the exact same IP and TCP port
  for (const [sessionId, existing] of discoveredDevices.entries()) {
    if (existing.ip === cleanIp && existing.tcpPort === normalizedDevice.tcpPort && sessionId !== normalizedDevice.sessionId) {
      discoveredDevices.delete(sessionId);
    }
  }

  discoveredDevices.set(normalizedDevice.sessionId, normalizedDevice);
}

// Remove device by sessionId
export function removeDevice(sessionId: string) {
  discoveredDevices.delete(sessionId);
}

// Get device by session id
export function getDevice(sessionId: string): devicesI | undefined {
  return discoveredDevices.get(sessionId);
}

// Get all devices
export function getDevices(): Map<string, devicesI> {
  return discoveredDevices;
}