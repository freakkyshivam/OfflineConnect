import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const time = formatTime(message.timestamp);

  return (
    <div
      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${
        isMine ? 'animate-slide-in-right' : 'animate-slide-in-left'
      }`}
    >
      <div
        className={`
          max-w-[70%] px-4 py-2.5 text-sm leading-relaxed
          ${
            isMine
              ? 'rounded-2xl rounded-br-sm text-white shadow-lg shadow-accent-500/15'
              : 'rounded-2xl rounded-bl-sm bg-surface-600 text-slate-200'
          }
        `}
        style={
          isMine
            ? {
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              }
            : undefined
        }
      >
        {message.content}
      </div>

      <span
        className={`mt-1 text-xs text-slate-500 ${
          isMine ? 'mr-1' : 'ml-1'
        }`}
      >
        {time}
      </span>
    </div>
  );
}
