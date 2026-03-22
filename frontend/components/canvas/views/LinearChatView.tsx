'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { Loader2 } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface LinearChatViewProps {
  /** The currently active chat node (the one being displayed in linear mode). */
  activeNode: Node | null;
  /** All chat messages from the active node's streaming hook. */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLoading: boolean;
  onSend: (text: string) => void;
}

export function LinearChatView({
  activeNode,
  messages,
  isLoading,
  onSend,
}: LinearChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const title = (activeNode?.data as any)?.title ?? 'Chat';

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div className="h-12 bg-primary px-5 flex items-center shrink-0">
        <span className="text-white text-sm font-semibold">{title}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 scrollbar-hidden">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Start a conversation to get help studying
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            index={idx}
            role={msg.role}
            content={msg.content}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-border rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
