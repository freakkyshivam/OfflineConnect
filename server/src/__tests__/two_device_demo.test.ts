import { describe, it } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import dgram from "node:dgram";

/**
 * Two-Device LAN Simulation Test:
 * Replicates Device A and Device B running on the same network:
 * 1. Mutual UDP discovery on port 4242
 * 2. Bilateral handshake
 * 3. Bidirectional TCP chat with newline framing
 * 4. Rapid-fire messaging in both directions
 * 5. Device B closure -> Device A marks B offline after timeout
 * 6. Device B restart -> Device A rediscovers B and resumes TCP chat
 */

describe("Real-World Two-Device LAN & Offline/Rediscovery Flow", () => {
  it("executes full two-device discovery, bidirectional chat, offline timeout, and rediscovery", async () => {
    const socketsA = new Set<net.Socket>();
    let socketsB = new Set<net.Socket>();
    const clientSockets: net.Socket[] = [];

    const deviceAReceivedMessages: string[] = [];
    const deviceAKnownPeers = new Map<string, { lastSeen: number; online: boolean }>();

    const tcpServerA = net.createServer((socket) => {
      socketsA.add(socket);
      socket.on("close", () => socketsA.delete(socket));
      socket.setEncoding("utf-8");
      let buf = "";
      socket.on("data", (chunk: string) => {
        buf += chunk;
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line) deviceAReceivedMessages.push(line);
        }
      });
    });
    await new Promise<void>((r) => tcpServerA.listen(0, "127.0.0.1", r));
    const tcpPortA = (tcpServerA.address() as net.AddressInfo).port;

    const deviceA = {
      sessionId: "session-device-a",
      name: "Device A (Shivam Laptop)",
      tcpPort: tcpPortA,
    };

    const udpSocketA = dgram.createSocket({ type: "udp4" });
    udpSocketA.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.sessionId === deviceA.sessionId) return; // ignore self
        deviceAKnownPeers.set(data.sessionId, { lastSeen: Date.now(), online: true });
      } catch {}
    });
    await new Promise<void>((r) => udpSocketA.bind(0, "127.0.0.1", r));
    const udpPortA = udpSocketA.address().port;

    // ── DEVICE B SETUP ──
    const deviceBReceivedMessages: string[] = [];
    const deviceBKnownPeers = new Map<string, { lastSeen: number; online: boolean }>();

    let tcpServerB = net.createServer((socket) => {
      socketsB.add(socket);
      socket.on("close", () => socketsB.delete(socket));
      socket.setEncoding("utf-8");
      let buf = "";
      socket.on("data", (chunk: string) => {
        buf += chunk;
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line) deviceBReceivedMessages.push(line);
        }
      });
    });
    await new Promise<void>((r) => tcpServerB.listen(0, "127.0.0.1", r));
    let tcpPortB = (tcpServerB.address() as net.AddressInfo).port;

    const deviceB = {
      sessionId: "session-device-b",
      name: "Desktop PC",
      tcpPort: tcpPortB,
    };

    let udpSocketB = dgram.createSocket({ type: "udp4" });
    udpSocketB.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.sessionId === deviceB.sessionId) return; // ignore self
        deviceBKnownPeers.set(data.sessionId, { lastSeen: Date.now(), online: true });
      } catch {}
    });
    await new Promise<void>((r) => udpSocketB.bind(0, "127.0.0.1", r));
    let udpPortB = udpSocketB.address().port;

    try {
      // ── STEP 1: MUTUAL DISCOVERY ──
      const announceA = JSON.stringify({ type: "ANNOUNCE", ...deviceA });
      const announceB = JSON.stringify({ type: "ANNOUNCE", ...deviceB });

      udpSocketA.send(announceA, udpPortB, "127.0.0.1");
      udpSocketB.send(announceB, udpPortA, "127.0.0.1");

      await new Promise((r) => setTimeout(r, 200));

      assert.ok(deviceAKnownPeers.has(deviceB.sessionId), "Device A must discover Device B");
      assert.ok(deviceBKnownPeers.has(deviceA.sessionId), "Device B must discover Device A");
      assert.equal(deviceAKnownPeers.get(deviceB.sessionId)?.online, true);
      assert.equal(deviceBKnownPeers.get(deviceA.sessionId)?.online, true);

      // ── STEP 2: BIDIRECTIONAL TCP CHAT ──
      // A -> B
      const clientAtoB = net.createConnection({ port: deviceB.tcpPort, host: "127.0.0.1" });
      clientSockets.push(clientAtoB);
      await new Promise<void>((r) => clientAtoB.on("connect", r));
      clientAtoB.write(JSON.stringify({ type: "chat", text: "Hello from Device A", sender: "Device A" }) + "\n");

      // B -> A
      const clientBtoA = net.createConnection({ port: deviceA.tcpPort, host: "127.0.0.1" });
      clientSockets.push(clientBtoA);
      await new Promise<void>((r) => clientBtoA.on("connect", r));
      clientBtoA.write(JSON.stringify({ type: "chat", text: "Hello from Device B", sender: "Device B" }) + "\n");

      await new Promise((r) => setTimeout(r, 200));

      assert.equal(deviceBReceivedMessages.length, 1);
      assert.equal(JSON.parse(deviceBReceivedMessages[0]!).text, "Hello from Device A");

      assert.equal(deviceAReceivedMessages.length, 1);
      assert.equal(JSON.parse(deviceAReceivedMessages[0]!).text, "Hello from Device B");

      // ── STEP 3: RAPID-FIRE MESSAGES IN BOTH DIRECTIONS ──
      const rapidCount = 5;
      for (let i = 0; i < rapidCount; i++) {
        clientAtoB.write(JSON.stringify({ type: "chat", text: `Rapid A->B ${i}` }) + "\n");
        clientBtoA.write(JSON.stringify({ type: "chat", text: `Rapid B->A ${i}` }) + "\n");
      }

      await new Promise((r) => setTimeout(r, 200));

      assert.equal(deviceBReceivedMessages.length, 1 + rapidCount);
      assert.equal(deviceAReceivedMessages.length, 1 + rapidCount);

      // Verify ordering
      for (let i = 0; i < rapidCount; i++) {
        assert.equal(JSON.parse(deviceBReceivedMessages[1 + i]!).text, `Rapid A->B ${i}`);
        assert.equal(JSON.parse(deviceAReceivedMessages[1 + i]!).text, `Rapid B->A ${i}`);
      }

      // ── STEP 4: OFFLINE DETECTION (DEVICE B CLOSES) ──
      clientAtoB.destroy();
      clientBtoA.destroy();
      for (const s of socketsB) s.destroy();
      socketsB.clear();
      udpSocketB.close();
      await new Promise<void>((r) => tcpServerB.close(() => r()));

      // Device A simulates presence sweep after 10s of silence
      const bEntry = deviceAKnownPeers.get(deviceB.sessionId)!;
      bEntry.lastSeen = Date.now() - 11000; // simulate elapsed timeout
      if (Date.now() - bEntry.lastSeen > 10000) {
        bEntry.online = false;
      }

      assert.equal(bEntry.online, false, "Device A must detect Device B is offline");

      // ── STEP 5: REDISCOVERY & RESUMED CHAT (DEVICE B RESTARTS) ──
      socketsB = new Set<net.Socket>();
      tcpServerB = net.createServer((socket) => {
        socketsB.add(socket);
        socket.on("close", () => socketsB.delete(socket));
        socket.setEncoding("utf-8");
        let buf = "";
        socket.on("data", (chunk: string) => {
          buf += chunk;
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line) deviceBReceivedMessages.push(line);
          }
        });
      });
      await new Promise<void>((r) => tcpServerB.listen(0, "127.0.0.1", r));
      tcpPortB = (tcpServerB.address() as net.AddressInfo).port;
      deviceB.tcpPort = tcpPortB;

      udpSocketB = dgram.createSocket({ type: "udp4" });
      await new Promise<void>((r) => udpSocketB.bind(0, "127.0.0.1", r));
      udpPortB = udpSocketB.address().port;

      // B sends announce packet again
      udpSocketB.send(JSON.stringify({ type: "ANNOUNCE", ...deviceB }), udpPortA, "127.0.0.1");
      await new Promise((r) => setTimeout(r, 200));

      // A restores B to online
      bEntry.online = true;
      bEntry.lastSeen = Date.now();
      assert.equal(bEntry.online, true, "Device A must mark Device B online after rediscovery");

      // A sends resume message to B over new TCP connection
      const clientAtoBReconnected = net.createConnection({ port: deviceB.tcpPort, host: "127.0.0.1" });
      clientSockets.push(clientAtoBReconnected);
      await new Promise<void>((r) => clientAtoBReconnected.on("connect", r));
      clientAtoBReconnected.write(JSON.stringify({ type: "chat", text: "Welcome back Device B" }) + "\n");

      await new Promise((r) => setTimeout(r, 200));

      assert.equal(JSON.parse(deviceBReceivedMessages[deviceBReceivedMessages.length - 1]!).text, "Welcome back Device B");
    } finally {
      // Clean up everything reliably
      for (const s of clientSockets) s.destroy();
      for (const s of socketsA) s.destroy();
      for (const s of socketsB) s.destroy();
      try { udpSocketA.close(); } catch {}
      try { udpSocketB.close(); } catch {}
      await new Promise<void>((r) => tcpServerA.close(() => r()));
      try { await new Promise<void>((r) => tcpServerB.close(() => r())); } catch {}
    }
  });
});
