import { type devicesI } from "./types.js";

/**
 * How long a peer can be silent before being marked offline.
 * Must survive at least 3 missed heartbeats (3 × 3s = 9s).
 */
export const PEER_TIMEOUT = 10_000;

const discoveredDevices = new Map<string, devicesI>();

/**
 * Add or update a device. Always marks it online.
 * Deduplicates by IP+port: if the same IP:tcpPort appears
 * under a different sessionId (peer restarted), the old
 * entry is removed.
 */
export function addDevice(device: devicesI): void {
  const cleanIp = device.ip.replace(/^::ffff:/, "");
  const normalizedDevice: devicesI = {
    ...device,
    ip: cleanIp,
    online: true,
  };

  // Remove stale session for the same IP + TCP port
  for (const [sessionId, existing] of discoveredDevices.entries()) {
    if (
      existing.ip === cleanIp &&
      existing.tcpPort === normalizedDevice.tcpPort &&
      sessionId !== normalizedDevice.sessionId
    ) {
      discoveredDevices.delete(sessionId);
    }
  }

  discoveredDevices.set(normalizedDevice.sessionId, normalizedDevice);
}

/** Hard-delete a device (used only by dedup, not by presence sweep). */
export function removeDevice(sessionId: string): void {
  discoveredDevices.delete(sessionId);
}

/** Look up a single device. */
export function getDevice(sessionId: string): devicesI | undefined {
  return discoveredDevices.get(sessionId);
}

/** Return the full Map (including offline entries). */
export function getDevices(): Map<string, devicesI> {
  return discoveredDevices;
}

/**
 * Presence sweep: mark stale peers offline.
 * Does NOT delete them — a future heartbeat will restore online.
 * Returns the names of peers that just went offline (for logging).
 */
export function sweepStaleDevices(): string[] {
  const now = Date.now();
  const wentOffline: string[] = [];

  for (const device of discoveredDevices.values()) {
    if (device.online && now - device.lastSeen > PEER_TIMEOUT) {
      device.online = false;
      wentOffline.push(device.name);
    }
  }

  return wentOffline;
}

/** Reset all state — for unit tests only. */
export function _resetForTesting(): void {
  discoveredDevices.clear();
}
