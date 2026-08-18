/* 
   OfflineConnect — Frontend Logic
   WebSocket connection, device list, chat UI, state management.
   No frameworks — plain JavaScript.
    */

(function () {
  "use strict";

  //  State 
  let ws = null;
  let reconnectTimer = null;
  let selfInfo = { sessionId: "", name: "" };
  let devices = [];
  let activeChat = null;       // sessionId of selected device
  let chatHistory = {};        // { sessionId: [ { text, fromSelf, timestamp } ] }
  let unreadCounts = {};       // { sessionId: number }

  //  DOM Helpers 
  const $ = (id) => document.getElementById(id);

  // Constants 
  const STORAGE_KEY = "offlineconnect_name";


  //  WebSocket Connection

  function connect() {
    // Connect to the same host that served this page
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = function () {
      console.log("WebSocket connected");
      showConnectionStatus(true);

      // If we already have a name, send it to the server
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
        console.error("Failed to parse message:", err);
      }
    };

    ws.onclose = function () {
      console.log("WebSocket disconnected");
      showConnectionStatus(false);
      scheduleReconnect();
    };

    ws.onerror = function () {
      // onclose will fire after this
    };
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  }

  function showConnectionStatus(connected) {
    const bar = $("connection-bar");
    const text = $("connection-text");
    bar.classList.remove("connected", "disconnected");
    if (connected) {
      bar.classList.add("connected");
      text.textContent = "Connected to server";
    } else {
      bar.classList.add("disconnected");
      text.textContent = "Disconnected — reconnecting…";
    }
  }

  
  //  Message Handlers
  

  function handleMessage(msg) {
    switch (msg.type) {
      case "self_info":
        selfInfo.sessionId = msg.sessionId;
        selfInfo.name = msg.name;
        $("self-name").textContent = msg.name;
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
        handleMessageSent(msg);
        break;
    }
  }

  function handleIncomingMessage(msg) {
    const sessionId = msg.from.sessionId;

    // Initialize chat history if needed
    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }

    chatHistory[sessionId].push({
      text: msg.text,
      fromSelf: false,
      timestamp: msg.timestamp,
      senderName: msg.from.name,
    });

    // If this chat is currently open, render the new message
    if (activeChat === sessionId) {
      appendMessage({
        text: msg.text,
        fromSelf: false,
        timestamp: msg.timestamp,
      });
    } else {
      // Increment unread count and update sidebar
      unreadCounts[sessionId] = (unreadCounts[sessionId] || 0) + 1;
      renderDeviceList();
    }

    // Play notification sound
    playNotificationSound();
  }

  function handleMessageSent(msg) {
    const sessionId = msg.to;

    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }

    chatHistory[sessionId].push({
      text: msg.text,
      fromSelf: true,
      timestamp: msg.timestamp,
    });

    // If this chat is currently open, render the sent message
    if (activeChat === sessionId) {
      appendMessage({
        text: msg.text,
        fromSelf: true,
        timestamp: msg.timestamp,
      });
    }
  }

  
  //  Device List


  function renderDeviceList() {
    const container = $("device-list");
    const emptyState = $("empty-devices");
    const countBadge = $("device-count");

    countBadge.textContent = devices.length;

    if (devices.length === 0) {
      // Remove all device items but keep empty state
      container.querySelectorAll(".device-item").forEach((el) => el.remove());
      if (emptyState) emptyState.style.display = "";
      return;
    }

    // Hide empty state
    if (emptyState) emptyState.style.display = "none";

    // Build new device items
    // Get existing device elements
    const existingItems = container.querySelectorAll(".device-item");
    const existingMap = {};
    existingItems.forEach((el) => {
      existingMap[el.dataset.sessionId] = el;
    });

    // Track which sessionIds are still present
    const currentIds = new Set(devices.map((d) => d.sessionId));

    // Remove devices no longer present
    existingItems.forEach((el) => {
      if (!currentIds.has(el.dataset.sessionId)) {
        el.remove();
      }
    });

    // Add or update devices
    devices.forEach((device) => {
      let el = existingMap[device.sessionId];

      if (!el) {
        // Create new device element
        el = createDeviceElement(device);
        container.appendChild(el);
      } else {
        // Update existing element
        updateDeviceElement(el, device);
      }
    });
  }

  function createDeviceElement(device) {
    const el = document.createElement("div");
    el.className = "device-item";
    el.dataset.sessionId = device.sessionId;

    el.addEventListener("click", function () {
      selectDevice(device.sessionId);
    });

    updateDeviceElement(el, device);
    return el;
  }

  function updateDeviceElement(el, device) {
    const isActive = activeChat === device.sessionId;
    const unread = unreadCounts[device.sessionId] || 0;
    const initial = (device.name || "?").charAt(0).toUpperCase();

    el.className = "device-item" + (isActive ? " active" : "");

    el.innerHTML = `
      <div class="device-avatar">${initial}</div>
      <div class="device-details">
        <div class="device-name">${escapeHtml(device.name)}</div>
        <div class="device-ip">${escapeHtml(device.ip)}</div>
      </div>
      <span class="status-dot online"></span>
      ${unread > 0 ? `<span class="unread-badge">${unread > 9 ? "9+" : unread}</span>` : ""}
    `;

    // Re-attach click listener since innerHTML was replaced
    el.onclick = function () {
      selectDevice(device.sessionId);
    };
  }

  
  //  Chat View
  

  function selectDevice(sessionId) {
    activeChat = sessionId;

    // Clear unread count
    unreadCounts[sessionId] = 0;
    renderDeviceList();

    // Find the device info
    const device = devices.find((d) => d.sessionId === sessionId);
    if (!device) return;

    // Update chat header
    $("peer-name").textContent = device.name;
    $("peer-ip").textContent = device.ip;
    $("peer-status").className = "status-dot online";

    // Show chat view, hide welcome
    $("welcome-screen").classList.add("hidden");
    $("chat-view").classList.remove("hidden");

    // On mobile, hide sidebar
    $("sidebar").classList.add("sidebar-hidden");

    // Enable send button
    $("send-btn").disabled = false;

    // Render message history
    renderMessages(sessionId);

    // Focus input
    $("message-input").focus();
  }

  function showWelcomeScreen() {
    activeChat = null;
    $("welcome-screen").classList.remove("hidden");
    $("chat-view").classList.add("hidden");
    $("send-btn").disabled = true;
    renderDeviceList();

    // On mobile, show sidebar
    $("sidebar").classList.remove("sidebar-hidden");
  }

  function updateActiveChatStatus() {
    if (!activeChat) return;

    const device = devices.find((d) => d.sessionId === activeChat);
    if (device) {
      $("peer-status").className = "status-dot online";
      $("peer-name").textContent = device.name;
      $("peer-ip").textContent = device.ip;
    } else {
      // Device went offline
      $("peer-status").className = "status-dot offline";
    }
  }

  function renderMessages(sessionId) {
    const container = $("messages");
    container.innerHTML = "";

    const history = chatHistory[sessionId] || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div class="chat-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No messages yet</p>
          <p style="font-size:12px; color:var(--text-muted)">Say hello to start the conversation!</p>
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

    // Remove "no messages" placeholder if present
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
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  
  //  Send Message


  function sendMessage() {
    const input = $("message-input");
    const text = input.value.trim();

    if (!text || !activeChat) return;

    send({
      type: "send_message",
      sessionId: activeChat,
      text: text,
    });

    input.value = "";
    input.focus();
  }

  
  //  Name Entry
  

  function initNameEntry() {
    const savedName = localStorage.getItem(STORAGE_KEY);

    if (savedName) {
      // Skip name entry, go straight to main app
      $("name-overlay").classList.add("hidden");
      $("main-app").classList.remove("hidden");
      return;
    }

    // Show name entry overlay
    const input = $("name-input");
    const btn = $("name-submit-btn");

    input.addEventListener("input", function () {
      btn.disabled = input.value.trim().length === 0;
    });

    // Submit on Enter key
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !btn.disabled) {
        submitName();
      }
    });

    btn.addEventListener("click", submitName);

    // Auto-focus the name input
    setTimeout(() => input.focus(), 300);
  }

  function submitName() {
    const input = $("name-input");
    const name = input.value.trim();
    if (!name) return;

    localStorage.setItem(STORAGE_KEY, name);

    // Send to server
    send({ type: "set_name", name: name });

    // Transition to main app
    $("name-overlay").classList.add("hidden");
    $("main-app").classList.remove("hidden");
  }


  //  Notification Sound (programmatic — no external files)


  let audioCtx = null;

  function playNotificationSound() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio not available — silently ignore
    }
  }


  //  Utilities
  

  function escapeHtml(text) {
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

  
  //  Event Listeners
  

  function bindEvents() {
    // Send message on button click
    $("send-btn").addEventListener("click", sendMessage);

    // Send message on Enter key
    $("message-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        sendMessage();
      }
    });

    // Enable/disable send button based on input
    $("message-input").addEventListener("input", function () {
      $("send-btn").disabled = !this.value.trim() || !activeChat;
    });

    // Back button (mobile)
    $("back-btn").addEventListener("click", showWelcomeScreen);
  }
 
  //  Init
  
  function init() {
    initNameEntry();
    bindEvents();
    connect();
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
