import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import {
  addDevice,
  getDevice,
  getDevices,
  sweepStaleDevices,
  _resetForTesting,
  PEER_TIMEOUT,
} from "../deviceStore.js";

import { startTcpServer } from "../tcpServer.js";
import { disconnectAllPeers } from "../tcpClient.js";

// ═══════════════════════════════════════════════════════════════════
//  Helper: create a device object
// ═══════════════════════════════════════════════════════════════════

function makeDevice(overrides: Partial<{
  sessionId: string;
  name: string;
  ip: string;
  tcpPort: number;
  lastSeen: number;
  online: boolean;
}> = {}) {
  return {
    sessionId: overrides.sessionId ?? "test-session-1",
    name: overrides.name ?? "TestDevice",
    tcpPort: overrides.tcpPort ?? 8080,
    udpPort: 4242,
    ip: overrides.ip ?? "192.168.1.10",
    udpFamily: "IPv4",
    lastSeen: overrides.lastSeen ?? Date.now(),
    online: overrides.online ?? true,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  PRESENCE TESTS
// ═══════════════════════════════════════════════════════════════════

describe("Presence: deviceStore", () => {

  beforeEach(() => {
    _resetForTesting();
  });

  // ── 1. New peer is discovered ──
  it("adds a new device as online", () => {
    addDevice(makeDevice());
    const dev = getDevice("test-session-1");

    assert.ok(dev, "device should exist");
    assert.equal(dev.online, true);
    assert.equal(dev.name, "TestDevice");
    assert.equal(dev.ip, "192.168.1.10");
  });

  // ── 2. Heartbeat updates lastSeen ──
  it("updates lastSeen on repeated addDevice", () => {
    const t1 = Date.now() - 5000;
    addDevice(makeDevice({ lastSeen: t1 }));

    const t2 = Date.now();
    addDevice(makeDevice({ lastSeen: t2 }));

    const dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.lastSeen, t2);
  });

  // ── 3. One missed heartbeat does not mark offline ──
  it("does NOT mark a peer offline after one missed heartbeat", () => {
    // lastSeen = 4 seconds ago (one missed heartbeat)
    addDevice(makeDevice({ lastSeen: Date.now() - 4000 }));

    const wentOffline = sweepStaleDevices();

    assert.equal(wentOffline.length, 0, "no peer should go offline");
    const dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.online, true);
  });

  // ── 4. Peer becomes offline after timeout ──
  it("marks a peer offline after PEER_TIMEOUT", () => {
    addDevice(makeDevice({ lastSeen: Date.now() - PEER_TIMEOUT - 1000 }));

    const wentOffline = sweepStaleDevices();

    assert.equal(wentOffline.length, 1);
    assert.equal(wentOffline[0], "TestDevice");

    const dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.online, false);
  });

  // ── 5. Offline peer is NOT deleted ──
  it("does NOT delete an offline peer from the Map", () => {
    addDevice(makeDevice({ lastSeen: Date.now() - PEER_TIMEOUT - 1000 }));
    sweepStaleDevices();

    const dev = getDevice("test-session-1");
    assert.ok(dev, "device must still exist in the Map");
    assert.equal(dev.online, false);
    assert.equal(getDevices().size, 1);
  });

  // ── 6. Later heartbeat restores the same peer to online ──
  it("restores an offline peer to online on new heartbeat", () => {
    // First: add and mark offline
    addDevice(makeDevice({ lastSeen: Date.now() - PEER_TIMEOUT - 1000 }));
    sweepStaleDevices();

    let dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.online, false);

    // New heartbeat arrives
    addDevice(makeDevice({ lastSeen: Date.now() }));

    dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.online, true);
    assert.equal(getDevices().size, 1, "should still be exactly 1 entry");
  });

  // ── 7. Duplicate heartbeats do not create duplicate peers ──
  it("does not create duplicates for repeated heartbeats", () => {
    addDevice(makeDevice());
    addDevice(makeDevice());
    addDevice(makeDevice());

    assert.equal(getDevices().size, 1);
  });

  // ── 8. Same IP+port but different sessionId replaces old entry ──
  it("deduplicates by IP+port across different sessionIds", () => {
    addDevice(makeDevice({ sessionId: "old-session" }));
    addDevice(makeDevice({ sessionId: "new-session" }));

    assert.equal(getDevices().size, 1);
    assert.ok(getDevice("new-session"));
    assert.equal(getDevice("old-session"), undefined);
  });

  // ── 9. Sweep does not mark recently-seen peers offline ──
  it("sweep ignores peers within timeout window", () => {
    addDevice(makeDevice({ lastSeen: Date.now() }));

    const wentOffline = sweepStaleDevices();

    assert.equal(wentOffline.length, 0);
    assert.equal(getDevice("test-session-1")!.online, true);
  });

  // ── 10. Already-offline peer is not re-reported ──
  it("does not re-report an already-offline peer", () => {
    addDevice(makeDevice({ lastSeen: Date.now() - PEER_TIMEOUT - 1000 }));

    const first = sweepStaleDevices();
    assert.equal(first.length, 1);

    const second = sweepStaleDevices();
    assert.equal(second.length, 0, "already offline — should not report again");
  });

  // ── 11. IPv6-mapped IPv4 addresses are normalized ──
  it("normalizes ::ffff: prefixed IPs", () => {
    addDevice(makeDevice({ ip: "::ffff:192.168.1.10" }));

    const dev = getDevice("test-session-1");
    assert.ok(dev);
    assert.equal(dev.ip, "192.168.1.10");
  });

  // ── 12. PEER_TIMEOUT is a reasonable value ──
  it("PEER_TIMEOUT is between 8 and 15 seconds", () => {
    assert.ok(PEER_TIMEOUT >= 8000, `PEER_TIMEOUT=${PEER_TIMEOUT} is too short`);
    assert.ok(PEER_TIMEOUT <= 15000, `PEER_TIMEOUT=${PEER_TIMEOUT} is too long`);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  TCP FRAMING TESTS
// ═══════════════════════════════════════════════════════════════════

describe("TCP framing: tcpServer", () => {

  // Helper: start server on random port and return port + close fn
  function startTestServer(
    onMsg: (data: string) => void,
  ): Promise<{ port: number; close: () => void }> {
    return new Promise((resolve) => {
      const srv = startTcpServer(0, (data) => onMsg(data));
      srv.on("listening", () => {
        const addr = srv.address() as net.AddressInfo;
        resolve({
          port: addr.port,
          close: () => srv.close(),
        });
      });
    });
  }

  // Helper: connect and send chunks with delays
  function sendChunks(
    port: number,
    chunks: string[],
    delayMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({ port, host: "127.0.0.1" }, () => {
        let i = 0;

        function sendNext() {
          if (i < chunks.length) {
            client.write(chunks[i]!);
            i++;
            setTimeout(sendNext, delayMs);
          } else {
            client.end();
            // Give server time to process the final chunk
            setTimeout(resolve, 100);
          }
        }

        sendNext();
      });

      client.on("error", reject);
    });
  }

  // ── 1. Single complete message ──
  it("processes a single newline-terminated message", async () => {
    const messages: string[] = [];
    const { port, close } = await startTestServer((d) => messages.push(d));

    await sendChunks(port, ['{"type":"chat","text":"hello"}\n'], 0);

    assert.equal(messages.length, 1);
    assert.equal(JSON.parse(messages[0]!).text, "hello");
    close();
  });

  // ── 2. Multiple messages in one chunk ──
  it("splits multiple messages arriving in one chunk", async () => {
    const messages: string[] = [];
    const { port, close } = await startTestServer((d) => messages.push(d));

    await sendChunks(
      port,
      ['{"a":1}\n{"b":2}\n{"c":3}\n'],
      0,
    );

    assert.equal(messages.length, 3);
    assert.equal(JSON.parse(messages[0]!).a, 1);
    assert.equal(JSON.parse(messages[1]!).b, 2);
    assert.equal(JSON.parse(messages[2]!).c, 3);
    close();
  });

  // ── 3. Split message across chunks ──
  it("reassembles a message split across TCP segments", async () => {
    const messages: string[] = [];
    const { port, close } = await startTestServer((d) => messages.push(d));

    await sendChunks(
      port,
      ['{"type":"ch', 'at","text":"split"}\n'],
      30,
    );

    assert.equal(messages.length, 1);
    assert.equal(JSON.parse(messages[0]!).text, "split");
    close();
  });

  // ── 4. Backward compat: message without trailing newline ──
  it("flushes remaining data on connection close (no trailing newline)", async () => {
    const messages: string[] = [];
    const { port, close } = await startTestServer((d) => messages.push(d));

    // Send without \n — the server should flush on connection end
    await sendChunks(port, ['{"legacy":true}'], 0);

    assert.equal(messages.length, 1);
    assert.equal(JSON.parse(messages[0]!).legacy, true);
    close();
  });

  // ── 5. Mixed: framed + split + coalesced ──
  it("handles a mix of framed, split and coalesced messages", async () => {
    const messages: string[] = [];
    const { port, close } = await startTestServer((d) => messages.push(d));

    // chunk 1: one complete message + start of second
    // chunk 2: end of second message + complete third message
    await sendChunks(
      port,
      [
        '{"n":1}\n{"n":',
        '2}\n{"n":3}\n',
      ],
      30,
    );

    assert.equal(messages.length, 3);
    assert.equal(JSON.parse(messages[0]!).n, 1);
    assert.equal(JSON.parse(messages[1]!).n, 2);
    assert.equal(JSON.parse(messages[2]!).n, 3);
    close();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  REGRESSION: TCP CHAT ROUND-TRIP
// ═══════════════════════════════════════════════════════════════════

describe("Regression: TCP chat round-trip", () => {

  beforeEach(() => {
    _resetForTesting();
    disconnectAllPeers();
  });

  afterEach(() => {
    disconnectAllPeers();
  });

  it("sendMessageToDevice delivers a framed message to tcpServer", async () => {
    const { sendMessageToDevice } = await import("../tcpClient.js");

    const received: string[] = [];

    // Start server on a random port
    const srv = startTcpServer(0, (data) => received.push(data));
    await new Promise<void>((resolve) => srv.on("listening", resolve));
    const port = (srv.address() as net.AddressInfo).port;

    // Register a fake device in the store
    addDevice({
      sessionId: "peer-1",
      name: "Peer",
      tcpPort: port,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    // Send a message
    const ok = await sendMessageToDevice("peer-1", {
      senderName: "Me",
      senderSessionId: "self-1",
      text: "Hello from test!",
      timestamp: Date.now(),
    });

    // Wait briefly for server to process
    await new Promise((r) => setTimeout(r, 200));

    assert.equal(ok, true);
    assert.equal(received.length, 1);
    const msg = JSON.parse(received[0]!);
    assert.equal(msg.type, "chat");
    assert.equal(msg.text, "Hello from test!");
    assert.equal(msg.senderName, "Me");

    srv.close();
  });

  it("returns false when device is offline", async () => {
    const { sendMessageToDevice } = await import("../tcpClient.js");

    addDevice({
      sessionId: "peer-2",
      name: "OfflinePeer",
      tcpPort: 9999,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now() - PEER_TIMEOUT - 1000,
      online: true,
    });

    // Mark offline
    sweepStaleDevices();

    const ok = await sendMessageToDevice("peer-2", {
      senderName: "Me",
      senderSessionId: "self-1",
      text: "Should fail",
      timestamp: Date.now(),
    });

    assert.equal(ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  CLIENT INTEGRATION: PEER CONNECTION & MESSAGE ORDERING
// ═══════════════════════════════════════════════════════════════════

describe("Client Integration: Peer Connection & Message Ordering", () => {
  beforeEach(() => {
    _resetForTesting();
    disconnectAllPeers();
  });

  afterEach(() => {
    disconnectAllPeers();
  });

  it("manages connection states: connecting -> connected -> disconnected", async () => {
    const { connectToPeer, disconnectPeer, getPeerState, onPeerStateChange } =
      await import("../tcpClient.js");

    const states: string[] = [];
    const unsub = onPeerStateChange((sId, st) => {
      if (sId === "peer-lifecycle") states.push(st);
    });

    const srv = startTcpServer(0, () => {});
    await new Promise<void>((resolve) => srv.on("listening", resolve));
    const port = (srv.address() as net.AddressInfo).port;

    addDevice({
      sessionId: "peer-lifecycle",
      name: "LifecyclePeer",
      tcpPort: port,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    const ok = await connectToPeer("peer-lifecycle");
    assert.equal(ok, true);
    assert.equal(getPeerState("peer-lifecycle"), "connected");

    // Disconnect
    disconnectPeer("peer-lifecycle");
    assert.equal(getPeerState("peer-lifecycle"), "disconnected");

    assert.ok(states.includes("connecting"));
    assert.ok(states.includes("connected"));
    assert.ok(states.includes("disconnected"));

    unsub();
    srv.close();
  });

  it("handles many messages quickly in order over the framed socket", async () => {
    const { sendMessageToDevice, connectToPeer, disconnectPeer } =
      await import("../tcpClient.js");

    const received: string[] = [];
    const srv = startTcpServer(0, (data) => received.push(data));
    await new Promise<void>((resolve) => srv.on("listening", resolve));
    const port = (srv.address() as net.AddressInfo).port;

    addDevice({
      sessionId: "peer-rapid",
      name: "RapidPeer",
      tcpPort: port,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    await connectToPeer("peer-rapid");

    // Send 10 messages in rapid succession
    const count = 10;
    const promises: Promise<boolean>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        sendMessageToDevice("peer-rapid", {
          senderName: "Tester",
          senderSessionId: "self-rapid",
          text: `Msg #${i}`,
          timestamp: Date.now() + i,
        }),
      );
    }

    const results = await Promise.all(promises);
    assert.ok(results.every((r) => r === true));

    // Wait briefly for all data events to flush
    await new Promise((r) => setTimeout(r, 200));

    assert.equal(received.length, count);
    for (let i = 0; i < count; i++) {
      const parsed = JSON.parse(received[i]!);
      assert.equal(parsed.text, `Msg #${i}`);
    }

    disconnectPeer("peer-rapid");
    srv.close();
  });
});

