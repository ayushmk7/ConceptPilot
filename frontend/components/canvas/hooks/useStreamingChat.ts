'use client';

import { useCallback, useRef, useState } from 'react';
import {
  createChatSession,
  sendMessage,
} from '@/lib/canvas-api';

export interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseStreamingChatOptions {
  /** Pre-seed the conversation (used when branching from another node). */
  initialMessages?: LocalMessage[];
}

interface UseStreamingChatReturn {
  messages: LocalMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  send: (text: string, context?: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook that manages a chat session for a single ChatNode.
 *
 * Uses the REST `/chat` endpoints.  When the backend gains an SSE streaming
 * endpoint, swap the `send` implementation to consume the event stream.
 */
export function useStreamingChat(
  nodeId: string,
  options?: UseStreamingChatOptions,
): UseStreamingChatReturn {
  const [messages, setMessages] = useState<LocalMessage[]>(
    options?.initialMessages ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const session = await createChatSession();
      sessionIdRef.current = session.id;
      return session.id;
    } catch (e) {
      throw new Error('Failed to create chat session. Is the backend running?');
    }
  }, []);

  const send = useCallback(
    async (text: string, context?: string) => {
      setError(null);
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      const messageForApi = context ? `${context}\n\n${text}` : text;

      try {
        const sid = await ensureSession();
        const res = await sendMessage(sid, messageForApi);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.assistant_message },
        ]);
      } catch (e: any) {
        const msg = e?.message || 'Failed to send message';
        setError(msg);
        // Fallback local response so the UI isn't stuck
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              '*(Backend unavailable — showing mock response)*\n\nI can help you study! Try asking me about a specific concept from your course material.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureSession],
  );

  const clearError = useCallback(() => setError(null), []);

  return { messages, isLoading, error, sessionId: sessionIdRef.current, send, clearError };
}
