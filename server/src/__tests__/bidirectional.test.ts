import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import {
  addDevice,
  getDevice,
  _resetForTesting,
} from "../deviceStore.js";

import { startTcpServer } from "../tcpServer.js";
import {
  connectToPeer,
  sendMessageToDevice,
  disconnectPeer,
  disconnectAllPeers,
  getPeerState,
  onPeerStateChange,
  onChatMessage,
  setSelfInfo,
  handleIncomingTcpData,
  type ChatMessage,
} from "../tcpClient.js";

describe("Bidirectional Peer-to-Peer TCP Communication", () => {
  const SERVER_A_SESSION_ID = "session-device-a";
  const SERVER_B_SESSION_ID = "session-device-b";

  beforeEach(() => {
    _resetForTesting();
    disconnectAllPeers();
    setSelfInfo({
      sessionId: SERVER_A_SESSION_ID,
      name: "Device A",
      tcpPort: 8080,
    });
  });

  afterEach(() => {
    disconnectAllPeers();
  });

  // ── TEST 1: A establishes connection to B. A sends message. B receives. ──
  it("Test 1: Device A establishes connection to Device B and sends message", async () => {
    const bReceivedMessages: string[] = [];

    const serverB = startTcpServer(0, (data) => {
      bReceivedMessages.push(data);
    });
    await new Promise<void>((r) => serverB.on("listening", r));
    const portB = (serverB.address() as net.AddressInfo).port;

    addDevice({
      sessionId: SERVER_B_SESSION_ID,
      name: "Device B",
      tcpPort: portB,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    const ok = await sendMessageToDevice(SERVER_B_SESSION_ID, {
      senderName: "Device A",
      senderSessionId: SERVER_A_SESSION_ID,
      text: "Hello from Device A",
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(ok, true, "Message send from A must succeed");
    assert.equal(bReceivedMessages.length, 1, "Device B must receive exactly 1 chat message");
    const parsed = JSON.parse(bReceivedMessages[0]!);
    assert.equal(parsed.text, "Hello from Device A");
    assert.equal(parsed.senderName, "Device A");

    serverB.close();
  });

  // ── TEST 2: B establishes connection to A. B sends message. A receives. ──
  it("Test 2: Device B establishes connection to Device A and sends message", async () => {
    const aReceivedMessages: ChatMessage[] = [];
    const unsub = onChatMessage((msg) => {
      aReceivedMessages.push(msg);
    });

    const serverA = startTcpServer(0, () => {});
    await new Promise<void>((r) => serverA.on("listening", r));
    const portA = (serverA.address() as net.AddressInfo).port;
    setSelfInfo({ tcpPort: portA });

    // Device B connects to Device A as a client
    const clientB = net.createConnection({ port: portA, host: "127.0.0.1" });
    await new Promise<void>((r) => clientB.on("connect", r));

    // B sends handshake then chat message
    const handshake = JSON.stringify({
      type: "handshake",
      sessionId: SERVER_B_SESSION_ID,
      name: "Device B",
      tcpPort: 9090,
    }) + "\n";
    clientB.write(handshake);

    const chat = JSON.stringify({
      type: "chat",
      senderSessionId: SERVER_B_SESSION_ID,
      senderName: "Device B",
      text: "Hello from Device B",
      timestamp: Date.now(),
    }) + "\n";
    clientB.write(chat);

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(aReceivedMessages.length, 1, "Device A must receive message from B");
    assert.equal(aReceivedMessages[0]!.text, "Hello from Device B");
    assert.equal(aReceivedMessages[0]!.senderName, "Device B");

    unsub();
    clientB.destroy();
    serverA.close();
  });

  // ── TEST 3: Simultaneous connect tie-breaker ──
  it("Test 3: Handles simultaneous connection attempts deterministically", async () => {
    // Session IDs: 'z' > 'a' lexicographically
    const SESS_HIGH = "session-peer-z";
    const SESS_LOW = "session-peer-a";

    setSelfInfo({
      sessionId: SESS_HIGH,
      name: "Higher Peer",
      tcpPort: 8080,
    });

    const serverHigh = startTcpServer(0, () => {});
    await new Promise<void>((r) => serverHigh.on("listening", r));
    const portHigh = (serverHigh.address() as net.AddressInfo).port;

    // Simulate incoming connection from lower sessionId
    const clientLow = net.createConnection({ port: portHigh, host: "127.0.0.1" });
    await new Promise<void>((r) => clientLow.on("connect", r));

    let receivedAck = false;
    clientLow.setEncoding("utf-8");
    clientLow.on("data", (chunk) => {
      if (chunk.includes("handshake_ack")) {
        receivedAck = true;
      }
    });

    // Lower peer sends handshake
    clientLow.write(
      JSON.stringify({
        type: "handshake",
        sessionId: SESS_LOW,
        name: "Low Device",
        tcpPort: 9091,
      }) + "\n"
    );

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(receivedAck, true, "Incoming connection should be acknowledged");
    assert.equal(getPeerState(SESS_LOW), "connected", "Peer should be registered as connected");

    // Now if a duplicate connection from lower arrives, tie-breaker rejects it cleanly
    const duplicateClient = net.createConnection({ port: portHigh, host: "127.0.0.1" });
    await new Promise<void>((r) => duplicateClient.on("connect", r));

    let receivedDuplicateNotice = false;
    duplicateClient.setEncoding("utf-8");
    duplicateClient.on("data", (chunk) => {
      if (chunk.includes("duplicate")) {
        receivedDuplicateNotice = true;
      }
    });

    duplicateClient.write(
      JSON.stringify({
        type: "handshake",
        sessionId: SESS_LOW,
        name: "Low Device",
        tcpPort: 9091,
      }) + "\n"
    );

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(receivedDuplicateNotice, true, "Duplicate connection must be rejected deterministically");

    clientLow.destroy();
    duplicateClient.destroy();
    serverHigh.close();
  });

  // ── TEST 4: Receiving device sends through accepted connection (BIDIRECTIONAL REUSE) ──
  it("Test 4: Receiving device can send messages back through the accepted connection", async () => {
    const bReceivedLines: string[] = [];

    const serverA = startTcpServer(0, () => {});
    await new Promise<void>((r) => serverA.on("listening", r));
    const portA = (serverA.address() as net.AddressInfo).port;
    setSelfInfo({ tcpPort: portA });

    // Device B initiates connection to Device A
    const socketBtoA = net.createConnection({ port: portA, host: "127.0.0.1" });
    socketBtoA.setEncoding("utf-8");
    socketBtoA.on("data", (chunk: string) => {
      bReceivedLines.push(chunk);
    });
    await new Promise<void>((r) => socketBtoA.on("connect", r));

    // Device B sends handshake to A
    socketBtoA.write(
      JSON.stringify({
        type: "handshake",
        sessionId: SERVER_B_SESSION_ID,
        name: "Device B",
        tcpPort: 9092,
      }) + "\n"
    );

    await new Promise((r) => setTimeout(r, 150));

    // Device A should now register Device B as connected
    assert.equal(getPeerState(SERVER_B_SESSION_ID), "connected");

    // Device A sends a message back to Device B
    // CRITICAL: Device A MUST reuse the accepted socket from B without trying to connect to B:9092!
    const ok = await sendMessageToDevice(SERVER_B_SESSION_ID, {
      senderName: "Device A",
      senderSessionId: SERVER_A_SESSION_ID,
      text: "Hello back Device B via accepted socket!",
      timestamp: Date.now(),
    });

    assert.equal(ok, true, "Device A must successfully send back through accepted socket");

    await new Promise((r) => setTimeout(r, 150));

    // Device B must receive Device A's reply on the EXACT SAME socket it opened to A!
    const chatLine = bReceivedLines.find((l) => l.includes("Hello back Device B via accepted socket!"));
    assert.ok(chatLine, "Device B must receive reply on its existing connection to A");
    const parsed = JSON.parse(chatLine!.trim());
    assert.equal(parsed.text, "Hello back Device B via accepted socket!");

    socketBtoA.destroy();
    serverA.close();
  });

  // ── TEST 5: Peer disconnects -> connection state becomes disconnected ──
  it("Test 5: Peer disconnect cleanly transitions state to disconnected", async () => {
    const states: string[] = [];
    const unsub = onPeerStateChange((sId, st) => {
      if (sId === SERVER_B_SESSION_ID) states.push(st);
    });

    const serverB = startTcpServer(0, () => {});
    await new Promise<void>((r) => serverB.on("listening", r));
    const portB = (serverB.address() as net.AddressInfo).port;

    addDevice({
      sessionId: SERVER_B_SESSION_ID,
      name: "Device B",
      tcpPort: portB,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    await connectToPeer(SERVER_B_SESSION_ID);
    assert.equal(getPeerState(SERVER_B_SESSION_ID), "connected");

    // Close server and peer
    disconnectPeer(SERVER_B_SESSION_ID);
    assert.equal(getPeerState(SERVER_B_SESSION_ID), "disconnected");
    assert.ok(states.includes("disconnected"));

    unsub();
    serverB.close();
  });

  // ── TEST 6: Peer reconnects -> connection becomes usable again ──
  it("Test 6: Peer reconnects and connection becomes usable again", async () => {
    let bReceived: string[] = [];

    let serverB = startTcpServer(0, (data) => bReceived.push(data));
    await new Promise<void>((r) => serverB.on("listening", r));
    let portB = (serverB.address() as net.AddressInfo).port;

    addDevice({
      sessionId: SERVER_B_SESSION_ID,
      name: "Device B",
      tcpPort: portB,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    // Initial message
    await sendMessageToDevice(SERVER_B_SESSION_ID, {
      senderName: "Device A",
      senderSessionId: SERVER_A_SESSION_ID,
      text: "First connection",
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(bReceived.length, 1);

    // Disconnect
    disconnectPeer(SERVER_B_SESSION_ID);
    serverB.close();

    // Device B restarts on a new port
    bReceived = [];
    serverB = startTcpServer(0, (data) => bReceived.push(data));
    await new Promise<void>((r) => serverB.on("listening", r));
    portB = (serverB.address() as net.AddressInfo).port;

    // Device store updated with new port
    addDevice({
      sessionId: SERVER_B_SESSION_ID,
      name: "Device B",
      tcpPort: portB,
      udpPort: 4242,
      ip: "127.0.0.1",
      udpFamily: "IPv4",
      lastSeen: Date.now(),
      online: true,
    });

    // Reconnect and send second message
    const ok = await sendMessageToDevice(SERVER_B_SESSION_ID, {
      senderName: "Device A",
      senderSessionId: SERVER_A_SESSION_ID,
      text: "Second connection after restart",
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(ok, true, "Reconnect send must succeed");
    assert.equal(bReceived.length, 1);
    assert.equal(JSON.parse(bReceived[0]!).text, "Second connection after restart");

    serverB.close();
  });

  // ── TEST 7: Rapid messages work in BOTH directions ──
  it("Test 7: Rapid messaging works bidirectionally over the single connection", async () => {
    const serverA = startTcpServer(0, () => {});
    await new Promise<void>((r) => serverA.on("listening", r));
    const portA = (serverA.address() as net.AddressInfo).port;
    setSelfInfo({ tcpPort: portA });

    const aReceived: ChatMessage[] = [];
    const unsub = onChatMessage((msg) => {
      aReceived.push(msg);
    });

    const bReceived: string[] = [];

    // Device B connects to A
    const socketB = net.createConnection({ port: portA, host: "127.0.0.1" });
    socketB.setEncoding("utf-8");
    socketB.on("data", (chunk: string) => {
      const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
      for (const line of lines) {
        if (!line.includes("handshake_ack")) {
          bReceived.push(line);
        }
      }
    });
    await new Promise<void>((r) => socketB.on("connect", r));

    // B sends handshake
    socketB.write(
      JSON.stringify({
        type: "handshake",
        sessionId: SERVER_B_SESSION_ID,
        name: "Device B",
        tcpPort: 9095,
      }) + "\n"
    );

    await new Promise((r) => setTimeout(r, 150));
    assert.equal(getPeerState(SERVER_B_SESSION_ID), "connected");

    const messageCount = 10;

    // Send 10 messages from B -> A
    for (let i = 0; i < messageCount; i++) {
      socketB.write(
        JSON.stringify({
          type: "chat",
          senderSessionId: SERVER_B_SESSION_ID,
          senderName: "Device B",
          text: `B->A message ${i}`,
          timestamp: Date.now() + i,
        }) + "\n"
      );
    }

    // Send 10 messages from A -> B
    for (let i = 0; i < messageCount; i++) {
      await sendMessageToDevice(SERVER_B_SESSION_ID, {
        senderName: "Device A",
        senderSessionId: SERVER_A_SESSION_ID,
        text: `A->B message ${i}`,
        timestamp: Date.now() + i,
      });
    }

    await new Promise((r) => setTimeout(r, 300));

    // Verify all 10 messages B->A arrived at A
    assert.equal(aReceived.length, messageCount, "Device A must receive all 10 messages from B");
    for (let i = 0; i < messageCount; i++) {
      assert.equal(aReceived[i]!.text, `B->A message ${i}`);
    }

    // Verify all 10 messages A->B arrived at B
    assert.equal(bReceived.length, messageCount, "Device B must receive all 10 messages from A");
    for (let i = 0; i < messageCount; i++) {
      assert.equal(JSON.parse(bReceived[i]!).text, `A->B message ${i}`);
    }

    unsub();
    socketB.destroy();
    serverA.close();
  });
});
