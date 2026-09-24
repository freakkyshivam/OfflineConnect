# OfflineConnect — Comprehensive Viva & Technical Evaluation Guide

This document contains detailed theoretical and implementation answers for professors, external examiners, and viva panels evaluating **OfflineConnect**.

---

## Section 1: Networking Fundamentals & Protocols

### Q1: Why use UDP for discovery and TCP for chat messaging? Why not use TCP or UDP for everything?
**Answer:**
- **Discovery via UDP Broadcast (`4242`)**:
  - In a decentralized local network, a node does not know the IP addresses or port numbers of any other node on boot.
  - TCP is a **connection-oriented** protocol that requires a 3-way handshake (`SYN` $\rightarrow$ `SYN-ACK` $\rightarrow$ `ACK`). You cannot perform a 3-way handshake with a broadcast destination address (`255.255.255.255`) because broadcast does not support stateful connection establishment.
  - UDP is **connectionless** and natively supports broadcasting (`SO_BROADCAST`), allowing a single datagram to reach all active nodes on the subnet simultaneously.
- **Chat via TCP (`8080`)**:
  - Text messages require guaranteed, in-order, lossless delivery.
  - If UDP were used for chat, dropped packets, duplicates, or out-of-order deliveries would corrupt conversations unless we rebuilt an entire transport layer (like TCP or QUIC) on top of UDP.
  - TCP natively provides:
    1. **Guaranteed delivery** (automatic retransmission via ACKs and timeouts).
    2. **In-order sequencing** (sequence and acknowledgment numbers).
    3. **Flow control and congestion control** (sliding window and congestion avoidance).
    4. **Connection state tracking** (detecting socket closure via `FIN` or `RST`).

---

### Q2: What is the "TCP Stream Abstraction" and why does TCP need message framing?
**Answer:**
- TCP does **not** preserve application-level message boundaries. It provides a continuous, unstructured **stream of octets (bytes)**.
- When an application calls `socket.write("Hello")` followed by `socket.write("World")`, TCP guarantees the receiver will read `'H', 'e', 'l', 'l', 'o', 'W', 'o', 'r', 'l', 'd'` in exact order.
- However, TCP gives **zero guarantee** about how many `data` events will be triggered on the receiving end. The receiver may receive:
  1. One combined buffer: `"HelloWorld"` (**Message Coalescing**)
  2. Multiple broken buffers: `"Hel"` followed by `"loWor"` followed by `"ld"` (**Message Fragmentation**)
- Therefore, any application protocol built on raw TCP **must define a framing mechanism** to demarcate where one message ends and the next begins.

---

### Q3: What causes Message Coalescing and Message Fragmentation in TCP?
**Answer:**
1. **Message Coalescing (Aggregation)**:
   - Caused by **Nagle's Algorithm** (RFC 896) on the sender side: to optimize network efficiency and reduce packet header overhead (20 bytes IP + 20 bytes TCP = 40 bytes minimum), small outgoing writes are buffered until either an ACK arrives or enough data accumulates to fill the Maximum Segment Size (MSS, typically 1460 bytes on Ethernet).
   - Also caused by OS receive buffering: while the receiver's CPU is processing, incoming TCP segments accumulate in the kernel socket buffer. A single `read()` call returns all available bytes coalesced together.
2. **Message Fragmentation (Splitting)**:
   - Occurs when the payload exceeds the network path's **Maximum Transmission Unit (MTU)** (1500 bytes for standard Ethernet). The IP layer or TCP MSS negotiation splits the message across multiple IP packets.
   - Also occurs under high network traffic or when the receiving socket's read buffer is smaller than the transmitted chunk.

---

### Q4: How is Message Framing implemented in OfflineConnect?
**Answer:**
OfflineConnect implements **Newline-Delimited Framing (`\n`)**:
1. **Sender (`tcpClient.ts`)**:
   ```ts
   const line = JSON.stringify(packet) + "\n";
   socket.write(line, "utf-8");
   ```
2. **Receiver (`tcpServer.ts`)**:
   - Each active socket maintains an internal string accumulator (`buffer = ""`).
   - On every `"data"` event chunk:
     ```ts
     buffer += chunk;
     let delimiterIndex: number;
     while ((delimiterIndex = buffer.indexOf("\n")) !== -1) {
       const rawLine = buffer.slice(0, delimiterIndex).trim();
       buffer = buffer.slice(delimiterIndex + 1);
       if (rawLine) {
         const message = JSON.parse(rawLine);
         handleMessage(message);
       }
     }
     ```
   - On socket `"end"` or `"close"`: Any remaining non-empty data in `buffer` is flushed and parsed, preventing message loss if the peer closes the socket immediately after writing without a trailing newline.

---

## Section 2: Presence, Heartbeats & Peer Management

### Q5: How does the presence system detect online and offline peers?
**Answer:**
- **Heartbeat Transmission (`discovery.ts`)**:
  - Every 3,000 milliseconds (`HEARTBEAT_INTERVAL`), the background discovery service broadcasts a UDP announcement containing its `sessionId`, `name`, `tcpPort`, and timestamp to `255.255.255.255:4242`.
- **Peer Record (`deviceStore.ts`)**:
  - When an announcement is received, the peer's record is updated with `lastSeen = Date.now()` and marked `online = true`.
- **Periodic Presence Sweep**:
  - Every 5,000 milliseconds (`SWEEP_INTERVAL`), `deviceStore.sweepStaleDevices()` iterates over all known peers:
    ```ts
    const age = now - device.lastSeen;
    if (device.online && age > PEER_TIMEOUT) { // 10,000 ms
      device.online = false;
      notifyUI(device); // Emits WebSocket update to UI
    }
    ```

---

### Q6: Why is `PEER_TIMEOUT` set to 10 seconds rather than marking a peer offline immediately after 1 missed heartbeat?
**Answer:**
- Wi-Fi networks inherently suffer from transient packet loss, radio interference, and channel contention (CSMA/CA).
- UDP is an unreliable datagram protocol: dropped broadcast packets are **never retransmitted**.
- If we marked a peer offline after 1 missed 3-second heartbeat:
  - Any single lost Wi-Fi frame or temporary OS thread pause would cause the peer's avatar in the UI to rapidly flicker between online and offline ("state flapping" / "jitter").
- Setting `PEER_TIMEOUT = 10,000ms` provides a **3-packet tolerance window** ($\approx 3.33$ missed heartbeats). A peer is only marked offline if it has been completely silent across multiple consecutive broadcast cycles, guaranteeing high stability.

---

### Q7: Why are offline peers kept in memory instead of being deleted?
**Answer:**
1. **User Experience & Chat History**: If a peer were deleted from `deviceStore` upon timeout, the peer would disappear from the UI sidebar, destroying open chat conversations and causing UI confusion.
2. **Fast Rediscovery**: Keeping the peer with `online: false` allows the UI to display an `OFFLINE` badge and disable message input. When the peer comes back online, its record flips back to `online: true` and the existing conversation resumes seamlessly without duplicate chat tabs.

---

### Q8: How does peer deduplication work?
**Answer:**
- On local networks, devices may restart (generating a new random `sessionId`), or multi-homed devices may announce from different network adapters.
- In `deviceStore.ts`:
  1. The primary lookup key is `sessionId`.
  2. Before creating a new device record, the store checks if an existing device shares the exact same normalized `IP` and `tcpPort`.
  3. If a match is found with a different `sessionId` (indicating the remote application was closed and restarted), the old stale record is replaced with the new session ID.
  4. IPv6-mapped IPv4 addresses (e.g., `::ffff:192.168.1.10`) are stripped down to canonical IPv4 format (`192.168.1.10`).

---

## Section 3: Electron Desktop Architecture

### Q9: Explain the architecture of the Electron desktop application.
**Answer:**
OfflineConnect follows the Electron **Multi-Process Architecture**:
1. **Main Process (`server/src/electron/main.ts`)**:
   - Runs in a full Node.js environment.
   - Manages application lifecycle (`app.whenReady()`, `app.on("before-quit")`).
   - Creates the native GUI window (`BrowserWindow`) and handles OS-level window events.
   - Controls the lifecycle of the local networking backend (`startBackend()` / `stop()`).
   - Ensures single-instance enforcement.
2. **Renderer Process (`client/`)**:
   - Runs inside Chromium as an isolated web browser context.
   - Renders the HTML5, CSS3, and JavaScript user interface.
   - Communicates with the local backend over loopback WebSocket (`ws://127.0.0.1:3000`) for real-time peer updates and messaging.
3. **Preload Script (`server/src/electron/preload.cjs`)**:
   - Runs with access to both DOM and a restricted Electron API bridge before web pages load.
   - Enforces **Context Isolation** (`contextIsolation: true`) and disables `nodeIntegration` to prevent Cross-Site Scripting (XSS) attacks from executing arbitrary OS shell commands.

---

### Q10: How does Single-Instance Lock work and why is it necessary?
**Answer:**
- **Why**: OfflineConnect binds to static well-known LAN ports: UDP port `4242` and TCP port `8080`.
  - If a user inadvertently launches two instances of the app on the same machine, the second instance would crash with `EADDRINUSE` (Address already in use).
- **Implementation**:
  ```ts
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  } else {
    app.on("second-instance", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
  ```
  If a second instance is launched, the operating system signals the first instance to restore and focus its window, while the second process immediately terminates cleanly.

---

### Q11: How is graceful shutdown handled when the user closes the app?
**Answer:**
- When the window is closed or the user presses `Alt+F4`, Electron triggers the `before-quit` event.
- The Main process intercepts this event:
  1. Signals `backend.stop()`:
     - Clears the presence sweep interval and UDP heartbeat timer.
     - Closes all active outbound TCP client sockets (`disconnectAllPeers()`).
     - Closes the TCP listening server (`tcpServer.close()`).
     - Closes the UDP broadcast socket (`discoverySocket.close()`).
     - Closes the HTTP and WebSocket bridge server (`httpServer.close()`).
  2. Once all operating system socket handles are released, Electron terminates the Node.js process cleanly without orphaned background threads.

---

## Section 4: LAN Edge Cases, Limitations & Trade-offs

### Q12: What is AP Isolation and how does it affect OfflineConnect?
**Answer:**
- **AP (Access Point) Isolation / Client Isolation** is a security setting on routers (standard in public Wi-Fi, hotels, universities) that prevents wireless clients from communicating directly with each other.
- When AP Isolation is enabled, the router drops all peer-to-peer unicast and broadcast frames at the MAC layer.
- **Impact**: OfflineConnect cannot discover or connect to peers on such networks.
- **Mitigation / Workaround**: Use a mobile hotspot, private home Wi-Fi router, or an Ethernet switch where client isolation is disabled.

---

### Q13: Why does Windows Defender Firewall block UDP broadcast or TCP bind?
**Answer:**
- By default, Windows Defender Firewall blocks unsolicited incoming network traffic on newly registered executables.
- In OfflineConnect:
  - UDP port 4242 receives unsolicited incoming broadcast datagrams from peers.
  - TCP port 8080 accepts unsolicited incoming TCP connection handshakes (`SYN`).
- When prompted, the user must check **"Private networks"** and click **"Allow Access"**. The documentation includes instructions for adding explicit Windows Firewall inbound rules if needed.

---

### Q14: What design trade-offs were made in OfflineConnect?
**Answer:**
1. **Decentralized LAN vs Cloud Broker**:
   - *Trade-off*: Eliminates server hosting costs, works during internet blackouts, and offers zero external data leakage. However, it is constrained to the local subnet (cannot chat with users across the internet or across non-routed subnets).
2. **Newline Framing vs Length-Prefixed Framing**:
   - *Trade-off*: Newline delimiter is simple, human-readable, and easy to debug in Wireshark. However, message payloads cannot contain literal raw newlines unless escaped as JSON strings (`\n`), which `JSON.stringify()` does automatically.
3. **Local Loopback Bridge (`127.0.0.1:3000`) vs Pure Electron IPC**:
   - *Trade-off*: The local HTTP/WS bridge allows the exact same client UI to be run either inside Electron or in any standard web browser (Chrome, Edge, Firefox) on the machine, providing great architecture flexibility and simplified automated testing.
