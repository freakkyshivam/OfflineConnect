import { useState, useEffect, useRef, useCallback } from 'react';
import type { Device, Message } from '../client/src/types';

const WS_URL = 'ws://localhost:3001';
const RECONNECT_DELAY = 2000;

interface Identity {
  id: string;
  name: string;
}

interface UseWebSocketReturn {
  devices: Device[];
  messages: Record<string, Message[]>;
  identity: Identity | null;
  connected: boolean;
  sendMessage: (to: string, content: string) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.log('[WS] Connected to backend');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'identity':
              setIdentity({ id: data.id, name: data.name });
              break;

            case 'devices':
              setDevices(
                data.devices.map((d: Device) => ({
                  id: d.id,
                  name: d.name,
                  ip: d.ip,
                  status: d.status,
                  lastSeen: d.lastSeen,
                }))
              );
              break;

            case 'message':
              setMessages((prev) => ({
                ...prev,
                [data.deviceId]: [
                  ...(prev[data.deviceId] ?? []),
                  data.message,
                ],
              }));
              break;
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        console.log('[WS] Disconnected, reconnecting...');
        setConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        // onclose will fire after this
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = useCallback((to: string, content: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send', to, content }));
    }
  }, []);

  return { devices, messages, identity, connected, sendMessage };
}
