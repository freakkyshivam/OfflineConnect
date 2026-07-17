# OfflineConnect

**Chat & Presence System for Any Local Network (LAN, WiFi, or Hotspot) — Product Requirements Document**
*College Networking Group Project | Draft v2 — updated after LAN testing*

---

## 1. Overview

OfflineConnect is a chat application that lets any device on the same local network find each other automatically and start messaging — no manual IP entry, no internet dependency, no external server required. "Local network" here means any network the devices happen to share: a wired LAN (like the college classroom), a WiFi router (like a home network), or a shared mobile hotspot. The discovery and messaging logic doesn't care which of these it's running on — it works the same way as long as devices are on the same subnet. The idea came from a simple observation: the class doesn't have many people comfortable with backend work, so the project needs to be technically solid in one place rather than spread thin across features nobody can maintain.

The project is being built for the college networking course, with a mentor assigned. It is designed to double as a demonstration of real-time systems and socket programming, which is a gap in the existing project portfolio (mostly REST APIs and queue-based systems so far).

## 2. Problem Statement

Existing chat tools assume internet access and rely on a central server sitting somewhere outside the room. Whenever a group of devices already shares a local network — a college LAN, a home WiFi router, or someone's phone hotspot — that internet round-trip is unnecessary overhead. There's no reason two devices a few feet apart, already connected to the same router or switch, should need to reach a server on the other side of the world to exchange a message.

OfflineConnect solves this by using whatever local network is already present for both discovery and communication — no internet required, regardless of whether that network is a cable, a router, or a hotspot.

## 3. Goals

- Automatically discover other devices running the app on the same subnet, with no manual configuration.
- Let any two discovered devices exchange messages in real time.
- Show accurate online/offline presence for everyone discovered.
- Keep the system usable without any internet connection.
- Build it so the workload can be split across a group with uneven coding experience.

## 4. Non-Goals (Out of Scope for v1)

- Working across different subnets/VLANs without additional routing configuration. *(Tested on the actual college classroom LAN — broadcast discovery works within the classroom subnet. This remains a documented limitation for any network segment not tested.)*
- Working for devices connected indirectly through another peer's mobile hotspot — depends on that specific hotspot's client isolation setting; not guaranteed and not a v1 requirement.
- End-to-end encryption (may be a stretch goal, not a launch requirement).
- Mobile app version — desktop/web-based client only for this phase.
- Large file transfer (multi-GB, resumable transfers) — only small attachments inside chat are in scope.
- Cloud/internet deployment (e.g. hosting on Render, Vercel) — this is fundamentally a local-network application; broadcast discovery cannot function across the internet, so there is no live public URL. Each device runs its own local instance.

## 5. Target Users

Students and staff on the same college LAN who want to communicate without depending on internet-based apps — for example during lab sessions, exams, or events where external connectivity is restricted or unreliable.

## 6. System Architecture

### 6.1 Discovery

Devices announce themselves on the local subnet using UDP broadcast on a fixed port. Each device periodically sends a small presence packet (device name, IP, status). Other devices listen on the same port and build a live list of who's currently reachable.

### 6.2 Messaging

Once two devices know about each other via discovery, chat messages are sent over a direct TCP connection between them. TCP is used here (not UDP) because messages need to arrive reliably and in order — dropped or out-of-order chat messages would break the experience.

### 6.3 Presence

A device is marked online as long as its broadcast packets keep arriving within an expected interval. If a device stops broadcasting (closed app, disconnected from network, crashed), it's marked offline after a short timeout — no manual "go offline" action needed.

> **Known constraint:** UDP broadcast discovery only works within a single subnet/broadcast domain. If a network segment uses VLANs to separate labs or floors, discovery will only surface devices within the same VLAN. This is expected and will be scoped honestly rather than overclaimed as "works across the whole campus."

### 6.4 Validation — Test Results

Before writing the core application, the discovery mechanism was validated directly on the college network to avoid building on an untested assumption.

- Host discovery (`nmap -sn`) on the classroom LAN subnet (`10.8.30.0/24`) found **25 active hosts** — consistent with the number of students actually connected by cable in that room. This indicated no aggressive VLAN segmentation within the classroom.
- A direct UDP broadcast test (custom sender/listener scripts) between two separate laptops on the classroom LAN **succeeded** — the listener received the broadcast message, confirming discovery will work in the intended demo environment.
- The same test **failed** in a separate college security lab, where a recent security policy restricts that lab's network to college-owned computers only. This is an intentional, room-specific IT policy, unrelated to the app itself, and does not affect the classroom (the intended demo location).
- Devices connected indirectly via a peer's mobile hotspot were **not** part of this test and are called out separately as a known limitation (see Non-Goals) — to be tested before relying on this as a demo path.

## 7. Feature List

### 7.1 Core Features (must-have for submission)

| Feature | Description | Owner Role |
|---|---|---|
| Device Discovery | Auto-detect devices on the same LAN via UDP broadcast | Backend/Networking |
| 1:1 Real-time Chat | Direct TCP-based messaging between two discovered devices | Backend/Networking |
| Online/Offline Presence | Live status indicator based on broadcast heartbeat | Backend/Networking |
| Chat UI | Contact list, message window, status indicators | Frontend |
| Connection Handling | Graceful handling of a peer disconnecting mid-chat | Backend/Networking |

### 7.2 Extended Features (if core is stable with time to spare)

- Group chat rooms (multiple discovered devices in one conversation)
- Local message history (stored per-device, not synced to any server)
- Read receipts / delivery status (sent → delivered)
- Small file/image attachments inside chat (not a full file-transfer subsystem)
- Basic notification sound/alert on new message
- Reconnect handling — a device that drops off the network and rejoins should reappear in discovery automatically
- Local message encryption (simple symmetric encryption within the LAN) — stretch goal, adds a security angle worth discussing in interviews if time allows

> **Note:** extended features are intentionally sequenced after core features and will not be started until discovery, chat, and presence are all working end-to-end. This is a deliberate scope control decision — the team has a history of feature creep, and this document exists partly to prevent that.

## 8. Team & Division of Labor

The class has very few members comfortable with backend/networking code, so the split below is designed around that reality rather than an idealized even split.

- **Backend/Networking** (sockets, discovery, message routing): primary owner — highest coding load.
- **Frontend/UI** (contact list, chat window, presence indicators): can be built by a teammate with lighter coding experience, once backend exposes a simple interface/events to hook into.
- **Testing, documentation, and demo prep**: remaining teammate(s), plus support from backend owner on integration testing.

Scope will be locked with the mentor in the first meeting to avoid uncontrolled feature addition later in the timeline.

## 9. Tech Stack (proposed)

- Language/runtime: Node.js (existing strength) or Java (if mentor prefers, given course uses Java networking/servlets)
- Networking: raw TCP/UDP sockets — no external chat framework, since the point is to demonstrate the networking layer itself
- UI: simple web-based interface (localhost) or lightweight desktop UI, kept minimal so frontend teammate isn't blocked
- Local storage (for extended feature — message history): lightweight local DB (SQLite) or flat file, no external/cloud DB

## 10. Non-Functional Requirements

- Should work with zero internet connectivity — LAN-only.
- Discovery should surface a new device within a few seconds of it joining the network.
- Should handle a device leaving/crashing without freezing the app for other users.
- Codebase should be simple enough for a teammate with limited backend experience to read and extend the UI layer without needing to touch socket code.

## 11. Deployment & Packaging

This application cannot be deployed to a cloud host (Render, Vercel, etc.) — broadcast-based discovery only functions on a local network, so there is no meaningful "live URL" for this project. Each device runs its own local instance instead.

### 11.1 For College Submission

The web app will be run locally (localhost) on each device during development and demoed as-is — no packaging needed for the submission deadline.

### 11.2 For Resume/Portfolio (after submission, not blocking it)

Once the core app is stable, it will be wrapped with Electron so it can run as an installed desktop app (double-click icon, no browser/localhost needed) rather than remaining resume-worthy only as a local script. A distributable installer (.exe/.dmg) is a stretch goal for portfolio purposes and is explicitly not required for the college submission.

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Team has limited backend experience | One person carries most of the core logic | Keep UI and backend cleanly separated so non-backend teammates can still contribute meaningfully |
| Feature creep (combining file-transfer + monitoring + chat, or bundling in a website/installer before the core works) | Scope balloons, nothing finishes properly | Extended features and packaging explicitly deferred until core is done; this PRD is the reference point |
| Limited time due to other academic commitments | Risk of rushed, untested final submission | Core feature set kept deliberately small and demo-able |
| Demo devices connected via a peer's hotspot instead of directly on the network | Client isolation on some phones can block discovery between hotspot-connected devices | Untested — verify before relying on hotspot as a demo path; bring a dedicated router as backup if needed |
| Security-restricted rooms (e.g. the college security lab) block non-college devices | App won't work in that specific room | Confirmed to be room-specific IT policy; demo will be conducted in the classroom, which was tested and works |

## 13. Success Criteria

- Two or more devices on the classroom LAN discover each other automatically without manual IP entry.
- Messages sent between two devices arrive reliably and in order.
- Presence status updates correctly when a device joins or leaves the network.
- Live demo runs without crashing in front of the mentor/evaluators.
- At least one extended feature (group chat or message history) is working, time permitting.

## 14. Open Questions

- Final tech stack: Node.js or Java — depends on mentor's preference and course alignment.
- Group size and final role assignment — pending group finalization.
- Whether hotspot-based connections need to work reliably for the demo, or whether the classroom's tested wired LAN setup will be used instead.