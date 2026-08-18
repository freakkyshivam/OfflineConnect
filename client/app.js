/* ═══════════════════════════════════════════════════════════════════
   OfflineConnect — Frontend Logic
   WebSocket connection, device list, chat UI, state management.
   Optimized for cross-platform two-way messaging on Desktop and Mobile.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── State ──────────────────────────────────────────────────────
  let ws = null;
  let reconnectTimer = null;
  let selfInfo = { sessionId: "", name: "" };
  let devices = [];
  let activeChat = null;       // sessionId of selected device
  let chatHistory = {};        // { sessionId: [ { text, fromSelf, timestamp, senderName } ] }
  let unreadCounts = {};       // { sessionId: number }

  // ─── DOM Helpers ────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "offlineconnect_name";

  // ═══════════════════════════════════════════════════════════════
  //  WebSocket Connection
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
      console.warn("[WS] Cannot send message - socket not open");
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
      text.textContent = "Disconnected — reconnecting…";
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Message Handlers
  // ═══════════════════════════════════════════════════════════════

  function handleMessage(msg) {
    switch (msg.type) {
      case "self_info":
        selfInfo.sessionId = msg.sessionId;
        selfInfo.name = msg.name;
        if ($("self-name")) $("self-name").textContent = msg.name;
        break;

      case "device_list":
        devices = msg.devices || [];
        renderDeviceList();
        updateActiveChatStatus();
        break;

      case "incoming_message":
        handleIncomingMessage(msg);
        break;

      case "message_sent":
        // Acknowledgment from backend
        console.log("[Message] Sent successfully to:", msg.to);
        break;
    }
  }

  function handleIncomingMessage(msg) {
    console.log("[Chat] Incoming message:", msg);
    const senderSessionId = msg.from.sessionId;
    const senderName = msg.from.name || "Peer";
    const timestamp = msg.timestamp || Date.now();

    // Ensure bucket exists in chatHistory
    if (!chatHistory[senderSessionId]) {
      chatHistory[senderSessionId] = [];
    }

    const messageObj = {
      text: msg.text,
      fromSelf: false,
      timestamp: timestamp,
      senderName: senderName,
    };

    chatHistory[senderSessionId].push(messageObj);

    // If sender is in our device list under a previous session ID, sync it
    const matchingDevice = devices.find(
      (d) => d.sessionId === senderSessionId || d.name === senderName
    );

    const isCurrentChat =
      activeChat === senderSessionId ||
      (matchingDevice && activeChat === matchingDevice.sessionId);

    if (isCurrentChat) {
      appendMessage({
        text: msg.text,
        fromSelf: false,
        timestamp: timestamp,
      });
    } else {
      // Unread notification
      unreadCounts[senderSessionId] = (unreadCounts[senderSessionId] || 0) + 1;
      renderDeviceList();
    }

    playNotificationSound();
  }

  // ═══════════════════════════════════════════════════════════════
  //  Device List Rendering
  // ═══════════════════════════════════════════════════════════════

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

    // Remove old items
    existingItems.forEach((el) => {
      if (!currentIds.has(el.dataset.sessionId)) {
        el.remove();
      }
    });

    // Add or update active items
    devices.forEach((device) => {
      let el = existingMap[device.sessionId];
      if (!el) {
        el = document.createElement("div");
        el.className = "device-item";
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

    el.className = "device-item" + (isActive ? " active" : "");

    el.innerHTML = `
      <div class="device-avatar">${escapeHtml(initial)}</div>
      <div class="device-details">
        <div class="device-name">${escapeHtml(device.name)}</div>
        <div class="device-ip">${escapeHtml(device.ip)}</div>
      </div>
      <span class="status-dot online"></span>
      ${unread > 0 ? `<span class="unread-badge">${unread > 9 ? "9+" : unread}</span>` : ""}
    `;

    el.onclick = function () {
      selectDevice(device.sessionId);
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Chat View Management
  // ═══════════════════════════════════════════════════════════════

  function selectDevice(sessionId) {
    activeChat = sessionId;

    // Reset unread count for this device
    unreadCounts[sessionId] = 0;
    renderDeviceList();

    const device = devices.find((d) => d.sessionId === sessionId);
    if (!device) return;

    // Update header details
    if ($("peer-name")) $("peer-name").textContent = device.name;
    if ($("peer-ip")) $("peer-ip").textContent = device.ip;
    if ($("peer-status")) $("peer-status").className = "status-dot online";

    // Switch view
    $("welcome-screen").classList.add("hidden");
    $("chat-view").classList.remove("hidden");

    // On mobile, hide sidebar to show chat panel
    $("sidebar").classList.add("sidebar-hidden");

    // Update send button state
    updateSendButtonState();

    // Render conversation history
    renderMessages(sessionId);

    // Focus input bar
    const input = $("message-input");
    if (input) input.focus();
  }

  function showWelcomeScreen() {
    activeChat = null;
    $("welcome-screen").classList.remove("hidden");
    $("chat-view").classList.add("hidden");
    updateSendButtonState();
    renderDeviceList();

    // On mobile, show sidebar
    $("sidebar").classList.remove("sidebar-hidden");
  }

  function updateActiveChatStatus() {
    if (!activeChat) return;

    const device = devices.find((d) => d.sessionId === activeChat);
    if (device) {
      if ($("peer-status")) $("peer-status").className = "status-dot online";
      if ($("peer-name")) $("peer-name").textContent = device.name;
      if ($("peer-ip")) $("peer-ip").textContent = device.ip;
    } else {
      if ($("peer-status")) $("peer-status").className = "status-dot offline";
    }
  }

  function renderMessages(sessionId) {
    const container = $("messages");
    if (!container) return;
    container.innerHTML = "";

    // Check history by sessionId or find matches by peer name
    let history = chatHistory[sessionId] || [];

    if (history.length === 0) {
      const device = devices.find((d) => d.sessionId === sessionId);
      if (device) {
        // Look for any history stored under a prior session ID with the same device name
        for (const [sId, msgs] of Object.entries(chatHistory)) {
          if (msgs.some((m) => m.senderName === device.name)) {
            history = msgs;
            break;
          }
        }
      }
    }

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

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = msg.text;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatTime(msg.timestamp);

    row.appendChild(bubble);
    row.appendChild(time);
    return row;
  }

  function scrollToBottom() {
    const container = $("messages");
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Send Message Action (Optimistic UI + WebSocket Relay)
  // ═══════════════════════════════════════════════════════════════

  function sendMessage() {
    const input = $("message-input");
    if (!input || !activeChat) return;

    const text = input.value.trim();
    if (!text) return;

    const timestamp = Date.now();

    // 1. Optimistically append message to local history and UI immediately
    if (!chatHistory[activeChat]) {
      chatHistory[activeChat] = [];
    }

    chatHistory[activeChat].push({
      text: text,
      fromSelf: true,
      timestamp: timestamp,
    });

    appendMessage({
      text: text,
      fromSelf: true,
      timestamp: timestamp,
    });

    // 2. Dispatch to backend TCP client
    send({
      type: "send_message",
      sessionId: activeChat,
      text: text,
    });

    input.value = "";
    updateSendButtonState();
    input.focus();
  }

  function updateSendButtonState() {
    const btn = $("send-btn");
    const input = $("message-input");
    if (btn && input) {
      btn.disabled = !input.value.trim() || !activeChat;
    }
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
  //  Sound & Utilities
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
      // Silent catch for autoplay constraints
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
  //  Event Listeners Binding
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

      messageInput.addEventListener("input", updateSendButtonState);
      messageInput.addEventListener("keyup", updateSendButtonState);
      messageInput.addEventListener("change", updateSendButtonState);
    }

    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showWelcomeScreen();
      });
    }

    // Auto scroll when mobile keyboard pops up
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
