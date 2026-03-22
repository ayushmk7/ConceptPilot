'use client';

import { useState, useRef, useEffect } from 'react';
import { CornerDownLeft } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-border">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed nowheel nodrag"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="w-9 h-9 bg-primary rounded-full flex items-center justify-center hover:bg-chart-2 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CornerDownLeft className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
