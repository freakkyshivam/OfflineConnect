import { useRef, useState } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;

  function handleSend() {
    if (isEmpty) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-surface-600 bg-surface-800 p-4">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="
            flex-1 rounded-xl border border-surface-500 bg-surface-700
            px-4 py-3 text-sm text-slate-200
            placeholder:text-slate-500
            transition-colors duration-200
            focus:border-accent-500 focus:outline-none
          "
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty}
          className={`
            rounded-xl bg-accent-500 p-3 text-white
            transition-all duration-200
            ${
              isEmpty
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-accent-400 hover:shadow-lg hover:shadow-accent-500/25 cursor-pointer'
            }
          `}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
