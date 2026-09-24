/* ═══════════════════════════════════════════════════════════════════
   OfflineConnect — Reliable Client Integration
   Peer discovery, connection state management, and 1:1 chat UI.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── State ──────────────────────────────────────────────────────
  let ws = null;
  let reconnectTimer = null;
  let selfInfo = { sessionId: "", name: "" };

  // devices: array of { sessionId, name, ip, tcpPort, online, connectionState }
  let devices = [];

  // activeChat: sessionId of currently selected peer (or null)
  let activeChat = null;

  // peerConnectionStates: { [sessionId]: "disconnected" | "connecting" | "connected" | "reconnecting" | "failed/offline" }
  const peerConnectionStates = {};

  // chatHistory: { [sessionId]: Array<{ id, text, fromSelf, timestamp, senderName, status }> }
  const chatHistory = {};

  // unreadCounts: { [sessionId]: number }
  const unreadCounts = {};

  // Deduplication set for incoming message IDs
  const seenMessageIds = new Set();

  // ─── DOM Helpers ────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "offlineconnect_name";

  // ═══════════════════════════════════════════════════════════════
  //  WebSocket Connection (Client ↔ Backend)
  // ═══════════════════════════════════════════════════════════════

  function connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || "localhost:3000";
    ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = function () {
      console.log("[WS] Connected to backend server");
      showConnectionStatus(true);

      // Register display name with backend
      const savedName = localStorage.getItem(STORAGE_KEY);
      if (savedName) {
        send({ type: "set_name", name: savedName });
      }

      // If a chat was active, request reconnect to peer
      if (activeChat) {
        const peer = devices.find((d) => d.sessionId === activeChat);
        if (peer && peer.online) {
          send({ type: "connect_peer", sessionId: activeChat });
        }
      }
    };

    ws.onmessage = function (event) {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (err) {
        console.error("[WS] Failed to parse message:", err);
      }
    };

    ws.onclose = function () {
      console.log("[WS] Disconnected from server");
      showConnectionStatus(false);
      scheduleReconnect();
    };

    ws.onerror = function (err) {
      console.error("[WS] Socket error:", err);
    };
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Cannot send message — socket not open");
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  }

  function showConnectionStatus(connected) {
    const bar = $("connection-bar");
    const text = $("connection-text");
    if (!bar || !text) return;

    bar.classList.remove("connected", "disconnected");
    if (connected) {
      bar.classList.add("connected");
      text.textContent = "Connected to local server";
    } else {
      bar.classList.add("disconnected");
      text.textContent = "Disconnected from local server — reconnecting…";
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Server Event Handlers
  // ═══════════════════════════════════════════════════════════════

  function handleMessage(msg) {
    switch (msg.type) {
      case "self_info":
        selfInfo.sessionId = msg.sessionId;
        selfInfo.name = msg.name;
        if ($("self-name")) $("self-name").textContent = msg.name;
        // Re-render device list to guarantee self device is excluded
        renderDeviceList();
        break;

      case "device_list":
        handleDeviceList(msg.devices || []);
        break;

      case "peer_state":
        handlePeerState(msg.sessionId, msg.state, msg.error);
        break;

      case "incoming_message":
        handleIncomingMessage(msg);
        break;

      case "message_sent":
        handleMessageSent(msg);
        break;

      case "message_failed":
        handleMessageFailed(msg);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Peer List Management
  // ═══════════════════════════════════════════════════════════════

  function handleDeviceList(newList) {
    // 1. Never include own device
    const filtered = newList.filter(
      (d) => d.sessionId !== selfInfo.sessionId,
    );

    // 2. Track previous online status to detect rediscovery
    const prevMap = new Map();
    devices.forEach((d) => prevMap.set(d.sessionId, d));

    devices = filtered;

    // 3. Update connection states from server info
    devices.forEach((d) => {
      if (d.connectionState) {
        peerConnectionStates[d.sessionId] = d.connectionState;
      } else if (!d.online) {
        peerConnectionStates[d.sessionId] = "failed/offline";
      }

      // Check for rediscovery of the active chat peer
      const prev = prevMap.get(d.sessionId);
      if (
        prev &&
        !prev.online &&
        d.online &&
        activeChat === d.sessionId
      ) {
        console.log(`[Presence] Active peer "${d.name}" came back online, reconnecting TCP...`);
        send({ type: "connect_peer", sessionId: d.sessionId });
      }
    });

    renderDeviceList();
    updateActiveChatStatus();
  }

  function handlePeerState(sessionId, state, error) {
    console.log(`[TCP] Peer ${sessionId} state: ${state} ${error ? `(${error})` : ""}`);
    peerConnectionStates[sessionId] = state;

    // Update sidebar entry if present
    const item = $(`device-item-${sessionId}`);
    if (item) {
      updateDeviceItemConnectionBadge(item, sessionId);
    }

    // Update active chat header and input controls if this is the active peer
    if (activeChat === sessionId) {
      updateActiveChatStatus();
    }
  }

  function renderDeviceList() {
    const container = $("device-list");
    const emptyState = $("empty-devices");
    const countBadge = $("device-count");
    if (!container) return;

    if (countBadge) countBadge.textContent = devices.length;

    if (devices.length === 0) {
      container.querySelectorAll(".device-item").forEach((el) => el.remove());
      if (emptyState) emptyState.style.display = "";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    const existingItems = container.querySelectorAll(".device-item");
    const existingMap = {};
    existingItems.forEach((el) => {
      existingMap[el.dataset.sessionId] = el;
    });

    const currentIds = new Set(devices.map((d) => d.sessionId));

    // Remove entries that no longer exist in the server peer Map
    existingItems.forEach((el) => {
      if (!currentIds.has(el.dataset.sessionId)) {
        el.remove();
      }
    });

    // Add or update active entries
    devices.forEach((device) => {
      let el = existingMap[device.sessionId];
      if (!el) {
        el = document.createElement("div");
        el.className = "device-item";
        el.id = `device-item-${device.sessionId}`;
        el.dataset.sessionId = device.sessionId;
        container.appendChild(el);
      }
      updateDeviceElement(el, device);
    });
  }

  function updateDeviceElement(el, device) {
    const isActive = activeChat === device.sessionId;
    const unread = unreadCounts[device.sessionId] || 0;
    const initial = (device.name || "?").charAt(0).toUpperCase();
    const isOnline = !!device.online;
    const connState = peerConnectionStates[device.sessionId] || (isOnline ? "disconnected" : "failed/offline");

    el.className = "device-item" + (isActive ? " active" : "");

    el.innerHTML = `
      <div class="device-avatar">${escapeHtml(initial)}</div>
      <div class="device-details">
        <div class="device-name">${escapeHtml(device.name)}</div>
        <div class="device-ip">${escapeHtml(device.ip)}:${device.tcpPort}</div>
      </div>
      <span class="status-dot ${isOnline ? "online" : "offline"}" title="${isOnline ? "Online" : "Offline"}"></span>
      <span class="peer-status-badge ${isOnline ? "online" : "offline"}">${isOnline ? "Online" : "Offline"}</span>
      ${unread > 0 ? `<span class="unread-badge">${unread > 9 ? "9+" : unread}</span>` : ""}
    `;

    el.onclick = function () {
      selectDevice(device.sessionId);
    };
  }

  function updateDeviceItemConnectionBadge(el, sessionId) {
    const device = devices.find((d) => d.sessionId === sessionId);
    if (!device) return;
    const isOnline = !!device.online;
    const dot = el.querySelector(".status-dot");
    const badge = el.querySelector(".peer-status-badge");
    if (dot) {
      dot.className = `status-dot ${isOnline ? "online" : "offline"}`;
    }
    if (badge) {
      badge.className = `peer-status-badge ${isOnline ? "online" : "offline"}`;
      badge.textContent = isOnline ? "Online" : "Offline";
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Chat View & Connection State
  // ═══════════════════════════════════════════════════════════════

  function selectDevice(sessionId) {
    // If selecting the already active chat, just keep it
    const isSameChat = activeChat === sessionId;
    activeChat = sessionId;

    // Reset unread count
    unreadCounts[sessionId] = 0;
    renderDeviceList();

    const device = devices.find((d) => d.sessionId === sessionId);
    if (!device) return;

    // Switch views
    $("welcome-screen").classList.add("hidden");
    $("chat-view").classList.remove("hidden");

    // On mobile, hide sidebar to show chat panel
    $("sidebar").classList.add("sidebar-hidden");

    // Render conversation history
    renderMessages(sessionId);

    // Update chat header and controls with actual network state
    updateActiveChatStatus();

    // If online and not already connected, initiate real TCP connection
    if (device.online) {
      const state = peerConnectionStates[sessionId];
      if (state !== "connected" && state !== "connecting") {
        send({ type: "connect_peer", sessionId });
      }
    }

    // Focus input if connected
    const input = $("message-input");
    if (input && device.online) {
      input.focus();
    }
  }

  function showWelcomeScreen() {
    // Clean up active chat state
    if (activeChat) {
      send({ type: "disconnect_peer", sessionId: activeChat });
    }
    activeChat = null;
    $("welcome-screen").classList.remove("hidden");
    $("chat-view").classList.add("hidden");
    renderDeviceList();

    // On mobile, show sidebar
    $("sidebar").classList.remove("sidebar-hidden");
  }

  function updateActiveChatStatus() {
    if (!activeChat) return;

    const device = devices.find((d) => d.sessionId === activeChat);
    const statusDot = $("peer-status");
    const peerName = $("peer-name");
    const peerIp = $("peer-ip");
    const sendBtn = $("send-btn");
    const msgInput = $("message-input");

    if (!device) {
      if (statusDot) statusDot.className = "status-dot offline";
      if (peerName) peerName.textContent = "Unknown device";
      if (peerIp) peerIp.textContent = "Offline";
      if (sendBtn) sendBtn.disabled = true;
      if (msgInput) {
        msgInput.disabled = true;
        msgInput.placeholder = "Device is offline";
      }
      return;
    }

    if (peerName) peerName.textContent = device.name;

    const connState = peerConnectionStates[device.sessionId] || (device.online ? "disconnected" : "failed/offline");

    // Compute display text and dot status based on genuine socket and discovery state
    let stateLabel = "";
    let dotClass = "offline";
    let canSend = false;

    if (!device.online) {
      stateLabel = "Offline";
      dotClass = "offline";
      canSend = false;
    } else {
      switch (connState) {
        case "connected":
          stateLabel = "Connected";
          dotClass = "online";
          canSend = true;
          break;
        case "connecting":
          stateLabel = "Connecting…";
          dotClass = "connecting";
          canSend = false;
          break;
        case "reconnecting":
          stateLabel = "Reconnecting…";
          dotClass = "reconnecting";
          canSend = false;
          break;
        case "failed/offline":
          stateLabel = "Connection failed";
          dotClass = "failed";
          canSend = false;
          break;
        case "disconnected":
        default:
          stateLabel = "Disconnected";
          dotClass = "disconnected";
          canSend = false;
          break;
      }
    }

    if (statusDot) statusDot.className = `status-dot ${dotClass}`;
    if (peerIp) {
      peerIp.textContent = `${device.ip}:${device.tcpPort} • ${stateLabel}`;
    }

    if (msgInput) {
      msgInput.disabled = !device.online;
      msgInput.placeholder = device.online
        ? "Type a message…"
        : "Device is offline";
    }

    updateSendButtonState(canSend);
  }

  function updateSendButtonState(canSendOverride) {
    const btn = $("send-btn");
    const input = $("message-input");
    if (!btn || !input) return;

    if (!activeChat) {
      btn.disabled = true;
      return;
    }

    const device = devices.find((d) => d.sessionId === activeChat);
    const isOnline = device && device.online;
    const connState = peerConnectionStates[activeChat];
    const isConnected = isOnline && (connState === "connected" || canSendOverride === true);

    const hasText = input.value.trim().length > 0;
    btn.disabled = !hasText || !isConnected;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Message Handling (Exactly-Once Delivery & Display)
  // ═══════════════════════════════════════════════════════════════

  function renderMessages(sessionId) {
    const container = $("messages");
    if (!container) return;
    container.innerHTML = "";

    const history = chatHistory[sessionId] || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div class="chat-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No messages yet</p>
          <p style="font-size:12px; color:var(--text-muted)">Send a message to start chatting!</p>
        </div>
      `;
      return;
    }

    history.forEach((msg) => {
      const row = createMessageElement(msg);
      container.appendChild(row);
    });

    scrollToBottom();
  }

  function appendMessage(msg) {
    const container = $("messages");
    if (!container) return;

    const empty = container.querySelector(".chat-empty");
    if (empty) empty.remove();

    const row = createMessageElement(msg);
    container.appendChild(row);
    scrollToBottom();
  }

  function createMessageElement(msg) {
    const row = document.createElement("div");
    row.className = "message-row " + (msg.fromSelf ? "sent" : "received");
    if (msg.id) row.dataset.msgId = msg.id;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = msg.text;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatTime(msg.timestamp);

    row.appendChild(bubble);
    row.appendChild(time);

    // If message failed, show indicator
    if (msg.status === "failed") {
      const statusText = document.createElement("div");
      statusText.className = "message-status failed";
      statusText.textContent = "Failed to send";
      row.appendChild(statusText);
    }

    return row;
  }

  function scrollToBottom() {
    const container = $("messages");
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  function sendMessage() {
    const input = $("message-input");
    if (!input || !activeChat) return;

    const text = input.value.trim();
    if (!text) return;

    const device = devices.find((d) => d.sessionId === activeChat);
    if (!device || !device.online) {
      console.warn("[Chat] Cannot send: device is offline");
      return;
    }

    // Generate unique message ID
    const msgId = crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`;
    const timestamp = Date.now();

    const msgObj = {
      id: msgId,
      text: text,
      fromSelf: true,
      timestamp: timestamp,
      status: "sending",
    };

    // 1. Add to local history exactly once
    if (!chatHistory[activeChat]) {
      chatHistory[activeChat] = [];
    }
    chatHistory[activeChat].push(msgObj);

    // 2. Render outgoing message immediately
    appendMessage(msgObj);

    // 3. Dispatch to backend over WebSocket
    send({
      type: "send_message",
      id: msgId,
      sessionId: activeChat,
      text: text,
    });

    input.value = "";
    updateSendButtonState();
    input.focus();
  }

  function handleMessageSent(msg) {
    const targetSessionId = msg.to;
    const history = chatHistory[targetSessionId];
    if (!history) return;

    const existing = history.find((m) => m.id === msg.id);
    if (existing) {
      existing.status = "delivered";
    }
  }

  function handleMessageFailed(msg) {
    const targetSessionId = msg.to;
    const history = chatHistory[targetSessionId];
    if (!history) return;

    const existing = history.find((m) => m.id === msg.id);
    if (existing) {
      existing.status = "failed";
      // Update DOM element if currently in active chat
      if (activeChat === targetSessionId) {
        const row = document.querySelector(`[data-msg-id="${msg.id}"]`);
        if (row && !row.querySelector(".message-status.failed")) {
          const statusText = document.createElement("div");
          statusText.className = "message-status failed";
          statusText.textContent = "Failed to send";
          row.appendChild(statusText);
        }
      }
    }
  }

  function handleIncomingMessage(msg) {
    const senderSessionId = msg.from.sessionId;
    const senderName = msg.from.name || "Peer";
    const timestamp = msg.timestamp || Date.now();
    const msgId = msg.id || `${senderSessionId}-${timestamp}-${msg.text}`;

    // Exactly-once incoming guarantee
    if (seenMessageIds.has(msgId)) {
      console.log(`[Chat] Ignoring duplicate message ${msgId}`);
      return;
    }
    seenMessageIds.add(msgId);

    if (!chatHistory[senderSessionId]) {
      chatHistory[senderSessionId] = [];
    }

    const messageObj = {
      id: msgId,
      text: msg.text,
      fromSelf: false,
      timestamp: timestamp,
      senderName: senderName,
      status: "delivered",
    };

    chatHistory[senderSessionId].push(messageObj);

    // If currently viewing this chat, append it immediately
    if (activeChat === senderSessionId) {
      appendMessage(messageObj);
    } else {
      unreadCounts[senderSessionId] = (unreadCounts[senderSessionId] || 0) + 1;
      renderDeviceList();
    }

    playNotificationSound();
  }

  // ═══════════════════════════════════════════════════════════════
  //  Name Entry Dialog
  // ═══════════════════════════════════════════════════════════════

  function initNameEntry() {
    const savedName = localStorage.getItem(STORAGE_KEY);

    if (savedName) {
      $("name-overlay").classList.add("hidden");
      $("main-app").classList.remove("hidden");
      return;
    }

    const input = $("name-input");
    const btn = $("name-submit-btn");
    if (!input || !btn) return;

    const checkInput = () => {
      btn.disabled = input.value.trim().length === 0;
    };

    input.addEventListener("input", checkInput);
    input.addEventListener("keyup", checkInput);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !btn.disabled) {
        submitName();
      }
    });

    btn.addEventListener("click", submitName);
    setTimeout(() => input.focus(), 250);
  }

  function submitName() {
    const input = $("name-input");
    const name = input.value.trim();
    if (!name) return;

    localStorage.setItem(STORAGE_KEY, name);
    send({ type: "set_name", name: name });

    $("name-overlay").classList.add("hidden");
    $("main-app").classList.remove("hidden");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Sound & Formatting Utilities
  // ═══════════════════════════════════════════════════════════════

  let audioCtx = null;

  function playNotificationSound() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.frequency.value = 750;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // Audio autoplay policy
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Event Bindings
  // ═══════════════════════════════════════════════════════════════

  function bindEvents() {
    const sendBtn = $("send-btn");
    const messageInput = $("message-input");
    const backBtn = $("back-btn");

    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMessage();
      });
    }

    if (messageInput) {
      messageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      messageInput.addEventListener("input", () => updateSendButtonState());
      messageInput.addEventListener("keyup", () => updateSendButtonState());
      messageInput.addEventListener("change", () => updateSendButtonState());
    }

    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showWelcomeScreen();
      });
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        scrollToBottom();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Initialization
  // ═══════════════════════════════════════════════════════════════

  function init() {
    initNameEntry();
    bindEvents();
    connect();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
