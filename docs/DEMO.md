# OfflineConnect — Comprehensive Live Demonstration Guide

This step-by-step guide is designed for live demonstrations, practical exams, and project evaluations. It walks evaluators and examiners through the entire operation of OfflineConnect across two machines on the same Local Area Network (LAN).

---

## 1. Prerequisites Checklist

Before beginning the demo, verify the following:

- **Two Windows Devices** (e.g., Laptop A and Laptop B) or two instances on separate network interfaces / VMs.
- **Shared Local Network**:
  - Both devices connected to the **same Wi-Fi router**, **mobile hotspot**, or **Ethernet switch**.
  - No active VPN or corporate proxy enabled on either machine (VPNs redirect broadcast traffic away from the physical LAN).
- **Firewall Preparedness**:
  - When the application starts for the first time, Windows Defender Firewall will display a security alert. Ensure **"Private networks (such as my home or work network)"** is checked and click **"Allow access"**.
- **Executable Binaries**:
  - Copy `OfflineConnect Setup 1.0.0.exe` (or `OfflineConnect 1.0.0.exe` portable) to both devices via USB drive or local file share.

---

## 2. Port Architecture Summary

OfflineConnect utilizes the following local ports:

| Port | Protocol | Purpose | Direction / Binding |
| :--- | :--- | :--- | :--- |
| **4242** | **UDP** | LAN Discovery & Presence Heartbeats | Broadcast to `255.255.255.255:4242`, Listen on `0.0.0.0:4242` (`reuseAddr: true`) |
| **8080** | **TCP** | Direct Peer-to-Peer 1:1 Chat Sockets | Listens on `0.0.0.0:8080`, outbound client connections to peer `IP:8080` |
| **3000** | **HTTP / WS** | Local IPC Backend Bridge | Bound to `127.0.0.1:3000` (loopback only, invisible to external LAN) |

---

## 3. Step-by-Step Live Demonstration Procedure

### Step 1: Launching on Device A
1. Double-click `OfflineConnect 1.0.0.exe` (or the desktop shortcut created by the installer).
2. The Electron window opens with a dark modern interface ($1080 \times 740$).
3. **Inspect the Header**:
   - The device card at the top-left displays your local machine's identity:
     - **Name**: e.g., `Shivam-Laptop`
     - **Local IP**: e.g., `192.168.1.15`
     - **Status**: `Ready on LAN (UDP :4242 | TCP :8080)`
   - The Peer list in the sidebar initially shows *"Scanning local network for devices..."*.

### Step 2: Launching on Device B
1. Double-click `OfflineConnect 1.0.0.exe` on Device B (e.g., `Pooja-PC` at `192.168.1.28`).
2. Allow Windows Firewall access on Private networks.
3. Within **1 to 3 seconds**, watch both screens:
   - On **Device A**: Device B appears in the sidebar with a green `ONLINE` badge:
     `Pooja-PC (192.168.1.28:8080) — ONLINE`
   - On **Device B**: Device A appears in the sidebar with a green `ONLINE` badge:
     `Shivam-Laptop (192.168.1.15:8080) — ONLINE`

> **What just happened under the hood?**
> Each device started a UDP socket sending an `ANNOUNCE` JSON packet to subnet broadcast (`255.255.255.255:4242`) every 3,000ms. When Device B received Device A's announcement, it cached Device A in its `deviceStore` and immediately responded with a unicast `ANNOUNCE` packet so discovery was instant.

---

### Step 3: Selecting a Peer & Connecting
1. On **Device A**, click on **Pooja-PC** in the discovered peers list.
2. The main chat panel activates:
   - Header shows: `Chat with Pooja-PC` · `192.168.1.28:8080`
   - A direct TCP socket connection is established to `192.168.1.28:8080`.
   - The status indicator switches to `Connected`.

---

### Step 4: Real-Time Bidirectional Messaging
1. **Device A sends**: Type `"Hello Pooja, this is a direct TCP socket message!"` and press Enter.
2. **Observe**:
   - On Device A: The bubble appears immediately on the right (sent bubble) with the local timestamp.
   - On Device B: Device A's chat opens (or updates unread badge) and the bubble appears on the left with sender name and timestamp.
3. **Device B replies**: Type `"Received perfectly! Replying over my reverse TCP socket."` and press Enter.
4. **Observe**: Both devices render the conversation thread in exact chronological order.

---

### Step 5: Rapid-Fire Messaging & TCP Stream Framing Verification
1. To prove that message boundary handling (TCP stream framing) works without message corruption:
   - On Device A, rapidly paste and send 5 short messages consecutively without pausing:
     - `Message 1`
     - `Message 2`
     - `Message 3`
     - `Message 4`
     - `Message 5`
2. **Examine the result on Device B**:
   - All 5 distinct messages are displayed as separate chat bubbles.
   - **No coalesced text** (e.g., `Message 1Message 2` joined together).
   - **No dropped messages**.
   - **Strict chronological ordering preserved**.

> **Viva Note**: Raw TCP is a continuous byte stream with no packet boundaries. If a sender transmits five small chunks quickly, Nagle's algorithm and OS socket buffers will coalesce them into a single TCP packet. OfflineConnect frames each message with a trailing newline `\n` and maintains a per-socket accumulator buffer (`buffer.indexOf("\n")`) to guarantee 100% boundary integrity.

---

### Step 6: Simulating Device Offline (Silence & Graceful Timeout)
1. On **Device B**, cleanly close the application (or toggle Wi-Fi OFF).
2. Watch **Device A's screen**:
   - During the first 3 to 6 seconds: Device B remains shown as `ONLINE` (resilient against brief packet drops on Wi-Fi).
   - At exactly **10 seconds** (the `PEER_TIMEOUT` threshold):
     - The background presence sweep runs.
     - Device B's status changes from green `ONLINE` to grey `OFFLINE`.
     - An informational notice in the chat thread indicates: *"Peer went offline. Messages cannot be delivered."*
     - The message input box is cleanly disabled to prevent dead socket writes.

---

### Step 7: Automatic Rediscovery & Seamless Reconnect
1. On **Device B**, relaunch the application (or turn Wi-Fi back ON).
2. Within **3 seconds**:
   - Device B sends a new UDP broadcast `ANNOUNCE` packet.
   - On **Device A**: Device B's badge immediately updates back to green `ONLINE`.
   - The chat input re-enables.
3. On **Device A**, type `"Glad you're back!"` and press Enter.
4. The outgoing TCP socket is re-established automatically and the message arrives on Device B without restarting the application.

---

## 4. Troubleshooting During Demos

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Peers don't see each other** | Windows Firewall blocked port 4242 UDP | Open Windows Defender Firewall → Allow an app → Ensure OfflineConnect has Private checked. |
| **Peers don't see each other** | Router has **AP Isolation / Client Isolation** enabled | Common on university/public campus Wi-Fi. Switch both laptops to a phone's Mobile Hotspot. |
| **Message fails to send** | Peer's TCP port 8080 blocked | Ensure both devices allow incoming connections on port 8080 TCP. |
| **Second window doesn't open on same PC** | Single-Instance Lock is active | By design, only one instance runs per machine. For single-PC testing, use the automated test suite `npm test`. |

---

## 5. Automated Demonstration Script (Headless Single-Machine Demo)

If two physical laptops are unavailable in the exam room, run the comprehensive two-device simulation test which executes the complete LAN flow on loopback:

```bash
npm test
```

This automated test executes:
1. Spawns Device A and Device B with independent UDP & TCP sockets.
2. Executes mutual broadcast discovery.
3. Establishes bidirectional TCP sockets.
4. Sends rapid-fire messages and verifies message order and delimiter framing.
5. Shuts down Device B and asserts Device A detects offline after timeout.
6. Restarts Device B and asserts Device A rediscovers B and resumes chat.
