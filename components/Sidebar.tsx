import { useState } from 'react';
import { Wifi, Search, Monitor, User } from 'lucide-react';
import type { Device, Message } from '../types';
import ContactItem from './ContactItem';

interface Identity {
  id: string;
  name: string;
}

interface SidebarProps {
  devices: Device[];
  activeDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  messages: Record<string, Message[]>;
  currentUserId: string;
  identity: Identity | null;
  connected: boolean;
}

export default function Sidebar({
  devices,
  activeDeviceId,
  onSelectDevice,
  messages,
  currentUserId,
  identity,
  connected,
}: SidebarProps) {
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.toLowerCase().includes(search.toLowerCase()),
  );

  const onlineCount = devices.filter((d) => d.status === 'online').length;

  // Extract initials from device name for the avatar
  const initials = identity
    ? identity.name
        .split(/[\s\-_]+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  // Extract IP from identity id (format: "ip:port")
  const userIp = identity ? identity.id.split(':')[0] : '—';

  return (
    <div className="w-80 h-full bg-surface-800 flex flex-col border-r border-surface-600">
      {/* ── Header ── */}
      <div className="p-5 border-b border-surface-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-500/20 flex items-center justify-center">
            <Wifi className="text-accent-400" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              OfflineConnect
            </h1>
            <p className="text-xs text-slate-500">LAN Chat &amp; Presence</p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="w-full bg-surface-700 text-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 border border-surface-500 focus:border-accent-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Contact List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filteredDevices.map((device) => {
          const deviceMessages = messages[device.id] ?? [];
          const lastMessage =
            deviceMessages.length > 0
              ? deviceMessages[deviceMessages.length - 1]
              : undefined;

          return (
            <ContactItem
              key={device.id}
              device={device}
              isActive={activeDeviceId === device.id}
              onClick={() => onSelectDevice(device.id)}
              lastMessage={lastMessage}
            />
          );
        })}
      </div>

      {/* ── Current User / Footer ── */}
      <div className="p-4 border-t border-surface-600">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/20">
              {identity ? (
                <span className="text-sm font-bold text-white">{initials}</span>
              ) : (
                <User className="text-white" size={18} />
              )}
            </div>
            {/* Online indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-800 ${
                connected ? 'bg-online animate-pulse-online' : 'bg-offline'
              }`}
            />
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">
                {identity ? identity.name : 'Connecting...'}
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  connected
                    ? 'bg-online/15 text-online'
                    : 'bg-offline/15 text-offline'
                }`}
              >
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {identity ? userIp : 'Waiting for backend...'}
            </p>
          </div>
        </div>

        {/* Device count */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 pl-[52px]">
          <Monitor size={12} />
          <span>{onlineCount} device{onlineCount !== 1 ? 's' : ''} on network</span>
        </div>
      </div>
    </div>
  );
}
