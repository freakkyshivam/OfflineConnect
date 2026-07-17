import { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Device, Message } from '../types';
import WelcomeScreen from './WelcomeScreen';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

interface ChatAreaProps {
  device: Device | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ChatArea({
  device,
  messages,
  currentUserId,
  onSendMessage,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!device) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-surface-900">
      {/* ── Chat Header ── */}
      <div className="h-[72px] bg-surface-800 border-b border-surface-600 flex items-center px-6 gap-4 shrink-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">
            {getInitials(device.name)}
          </span>
        </div>

        {/* Name & Status */}
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold truncate">
            {device.name}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                device.status === 'online' ? 'bg-online' : 'bg-offline'
              }`}
            />
            <span className="text-xs text-slate-400 capitalize">
              {device.status}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <span className="bg-surface-700 text-slate-400 text-xs px-3 py-1 rounded-full">
            {device.ip}
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-1">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-500">
              Start a conversation with{' '}
              <span className="text-accent-400">{device.name}</span>
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Message Input ── */}
      <MessageInput onSend={onSendMessage} />
    </div>
  );
}
