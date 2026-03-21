'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  branchMode?: 'off' | 'manual';
  selectedIndices?: Set<number>;
  onBranchFromHere?: (index: number) => void;
  onToggleSelect?: (index: number) => void;
}

export function MessageList({
  messages,
  isLoading,
  branchMode = 'off',
  selectedIndices,
  onBranchFromHere,
  onToggleSelect,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div className="text-center text-sm text-[#94A3B8]">
          Start a conversation to get help studying
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 nowheel nodrag"
    >
      {messages.map((msg, idx) => (
        <MessageBubble
          key={idx}
          index={idx}
          role={msg.role}
          content={msg.content}
          branchMode={branchMode}
          isSelected={selectedIndices?.has(idx)}
          onBranchFromHere={onBranchFromHere}
          onToggleSelect={onToggleSelect}
        />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <Loader2 className="w-4 h-4 text-[#00274C] animate-spin" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
