# OfflineConnect Backend — Full Build Guide (Discovery → Auto-Connect Chat → Heartbeat)

This is a complete reference so you don't need to re-ask each piece. Follow it top to bottom, in order — each stage depends on the previous one working. Don't skip ahead even if a later stage looks easy.

---

## Folder Structure

```
offlineconnect/
├── package.json
├── src/
│   ├── discovery.js       ← UDP broadcast + presence Map + timeout/offline detection
│   ├── tcpServer.js        ← TCP server, accepts incoming chat connections
│   ├── tcpClient.js        ← sendMessageToDevice() — on-demand outgoing connections
│   ├── deviceStore.js      ← the shared discoveredDevices Map + helper functions
│   └── index.js             ← wires everything together, the actual entry point you run
├── frontend/                ← (later — not needed for backend-only week)
└── notes/
    └── this-file.md
```

**Why split into these files:** `discovery.js` and `tcpServer.js`/`tcpClient.js` both need to read/write the *same* device list — that's why `deviceStore.js` exists separately, so both sides import from one shared source instead of keeping their own copies that go out of sync.

---

## Stage 1 — `deviceStore.js` (the shared source of truth)

**Purpose:** One Map, shared by discovery (which writes to it) and messaging (which reads from it).

**What to write:**
```js
const discoveredDevices = new Map();

function addOrUpdateDevice(sessionId, info) {
  discoveredDevices.set(sessionId, { ...info, lastSeen: Date.now() });
}

function removeDevice(sessionId) {
  discoveredDevices.delete(sessionId);
}

function getDevice(sessionId) {
  return discoveredDevices.get(sessionId);
}

function getAllDevices() {
  return Array.from(discoveredDevices.values());
}

module.exports = { discoveredDevices, addOrUpdateDevice, removeDevice, getDevice, getAllDevices };
```

**Why a function-based wrapper instead of exporting the raw Map:** it's not strictly required, but it means if you later change *how* devices are stored (e.g. add validation, or switch structure), you only change it in one place instead of hunting through discovery.js and tcpClient.js both.

**Self-check before moving on:** why does `addOrUpdateDevice` set `lastSeen: Date.now()` every single time, even on an *update* (not just a new device)? What breaks in the timeout logic later if you forget this?

---

## Stage 2 — `discovery.js` (you've mostly built this already)

**Purpose:** Broadcast your own presence, listen for others, keep `deviceStore` updated, remove stale entries.

**What changes from what you already have:**
1. Import `addOrUpdateDevice` and `removeDevice` from `deviceStore.js` instead of managing your own local Map.
2. **Add `tcpPort` to the broadcast packet** — this was the missing piece from before:
```js
const presencePacket = {
  type: "presence",
  name: DEVICE_NAME,       // give your device a name, e.g. from os.hostname()
  sessionId,
  tcpPort: TCP_PORT         // the port your TCP server (Stage 3) listens on
};
```
3. On receiving a valid, non-self message:
```js
addOrUpdateDevice(data.sessionId, {
  name: data.name,
  ip: rinfo.address,
  tcpPort: data.tcpPort
});
```
4. In your timeout-check `setInterval`, call `removeDevice(sessionId)` instead of `Map.delete()` directly.

**Self-check:** if `TCP_PORT` is a hardcoded constant (say `8080`) and you run two instances of this app *on the same laptop* for testing, what will go wrong, and why? (This matters for how you test locally before using two real devices.)

---

## Stage 3 — `tcpServer.js` (accepting incoming chat connections)

**Purpose:** Listen for incoming TCP connections from other devices and print/handle whatever they send. You already built a version of this (the multi-client broadcast one) — reuse that logic here, cleaned up.

**What to write (core shape):**
```js
const net = require('node:net');

function startTcpServer(port, onMessage) {
  const server = net.createServer((socket) => {
    socket.setEncoding('utf-8');

    socket.on('data', (data) => {
      onMessage(data, socket); // hand the message up to index.js to decide what to do with it
    });

    socket.on('error', (err) => {
      console.log('Socket error:', err.message);
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`TCP server listening on port ${port}`);
  });

  return server;
}

module.exports = { startTcpServer };
```

**Why `onMessage` is passed in as a callback instead of hardcoded here:** this file's only job is "accept connections and hand off data" — deciding *what to do* with a chat message (print it, forward it to a UI, save it to history) is a separate concern that belongs in `index.js`. Keeping them separate means you can change what happens to a message without touching the networking code.

**Self-check:** why `"0.0.0.0"` here and not `"127.0.0.1"`? (You already learned this the hard way — write the answer down so it sticks.)

---

## Stage 4 — `tcpClient.js` (on-demand outgoing messages)

**Purpose:** When you want to send a message to a specific discovered device, connect, send, close.

```js
const net = require('node:net');
const { getDevice } = require('./deviceStore');

function sendMessageToDevice(sessionId, message) {
  const device = getDevice(sessionId);
  if (!device) {
    console.log("Device not found or offline");
    return;
  }

  const client = net.createConnection({ port: device.tcpPort, host: device.ip }, () => {
    client.write(message);
    client.end();
  });

  client.on('error', (err) => {
    console.log(`Failed to reach ${device.name}:`, err.message);
  });
}

module.exports = { sendMessageToDevice };
```

This is the on-demand/lazy-connection approach we already settled on — simplest option, good enough for now. Don't add connection pooling or keep-alive logic yet; that's a later optimization, not a Week 1 requirement.

**Self-check:** what happens right now if `device` exists in the Map but that device just went offline 2 seconds ago (its entry hasn't timed out yet)? Is that a problem worth solving this week, or acceptable for now?

---

## Stage 5 — Heartbeat / Presence Timeout (you've built this — this section is just to make sure it's wired correctly)

This is **not a separate feature** — it's the timeout-checking `setInterval` inside `discovery.js`, using `deviceStore`'s `removeDevice`. Just confirm:

- It runs on its own `setInterval` (separate from the broadcast-sending interval).
- It checks `Date.now() - device.lastSeen > TIMEOUT_MS` (recommended: 6000ms timeout, checked every 3000ms).
- It calls `removeDevice(sessionId)` when a device times out — and ideally logs "X went offline" so you can see it happening.

**Self-check:** if you set the timeout to something very short (say 500ms) while your broadcast interval is 2000ms, what will happen to your device list? (This is a real bug you can trigger and observe — try it once so you *see* why timeout must be meaningfully longer than the broadcast interval.)

---

## Stage 6 — `index.js` (wiring it all together)

**Purpose:** The actual file you run (`node src/index.js`). Starts discovery, starts the TCP server, and defines what happens when a message arrives.

```js
const { startDiscovery } = require('./discovery');
const { startTcpServer } = require('./tcpServer');
const { sendMessageToDevice } = require('./tcpClient');
const { getAllDevices } = require('./deviceStore');

const TCP_PORT = 8080;

startDiscovery(TCP_PORT); // pass your TCP port so it's included in presence packets

startTcpServer(TCP_PORT, (data, socket) => {
  console.log(`Received: ${data}`);
  // later: forward this to a UI, save to history, etc.
});

// Example manual test — replace with real UI-triggered calls later:
// setTimeout(() => {
//   const devices = getAllDevices();
//   if (devices.length > 0) sendMessageToDevice(devices[0].sessionId, "hello from index.js");
// }, 5000);
```

**Note:** you'll need to restructure `discovery.js` slightly so it exports a `startDiscovery(tcpPort)` function instead of running immediately on import — this is a small refactor of what you already have, not new logic.

---

## Order to actually build this in (matches your 1-week plan)

1. Write `deviceStore.js` first — it's small and has no dependencies.
2. Refactor your existing `discovery.js` to use it, add `tcpPort` to packets. Test on two devices — confirm the Map now has `ip` and `tcpPort` for discovered peers.
3. Write `tcpServer.js` using your existing multi-client logic. Test standalone (like before, hardcoded IP) to make sure it still works after the refactor.
4. Write `tcpClient.js`. Test it manually — hardcode a `sessionId` you know exists from step 2's Map, call `sendMessageToDevice()`, confirm the other device's server receives it.
5. Write `index.js` to wire everything together — this is the moment discovery and messaging actually become one system instead of separate test scripts.
6. Only after step 5 works end-to-end on two real devices: move to group chat / file sharing (Phase 2).

## Notes column (fill this yourself as you go)

| Stage | Done? | What broke / what I learned |
|---|---|---|
| deviceStore.js | | |
| discovery.js refactor | | |
| tcpServer.js | | |
| tcpClient.js | | |
| index.js wiring | | |
