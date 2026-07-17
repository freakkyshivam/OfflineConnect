import type { Device, Message } from '../types';

interface ContactItemProps {
  device: Device;
  isActive: boolean;
  lastMessage?: Message;
  onClick: () => void;
}

function hashDeviceId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function ContactItem({
  device,
  isActive,
  lastMessage,
  onClick,
}: ContactItemProps) {
  const hue = hashDeviceId(device.id) % 360;
  const initials = device.name.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex w-full items-center gap-3 rounded-xl px-3 py-3
        transition-all duration-200 cursor-pointer
        ${
          isActive
            ? 'bg-surface-600 border-l-2 border-accent-400'
            : 'border-l-2 border-transparent hover:bg-surface-600'
        }
      `}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white select-none"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${(hue + 40) % 360}, 70%, 55%))`,
          }}
        >
          {initials}
        </div>

        {/* Status dot */}
        <span
          className={`
            absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full
            border-2 border-surface-800
            ${
              device.status === 'online'
                ? 'bg-online animate-pulse-online'
                : 'bg-offline'
            }
          `}
        />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-slate-200">
            {device.name}
          </span>
        </div>

        <p className="truncate text-xs text-slate-500">{device.ip}</p>

        {lastMessage && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
}
