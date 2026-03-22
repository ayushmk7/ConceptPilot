'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { infStreamMessage } from '@/lib/canvas-api';
import type { InfCanvasNode, InfCanvasEdge } from '@/lib/canvas-api';

export interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolResultPayload {
  name: string;
  nodes: InfCanvasNode[];
  edges: InfCanvasEdge[];
}

interface UseStreamingChatOptions {
  /** Pre-seed the conversation (used when branching from another node). */
  initialMessages?: LocalMessage[];
  /**
   * Canvas session ID from `infJoinSession`. Optional — falls back to a
   * per-hook UUID so the hook works before Task 7 wires real sessions.
   */
  sessionId?: string;
  /**
   * Called when the backend emits a `tool_result` event with new canvas
   * nodes/edges (e.g. from `create_branches`). The canvas page wires this
   * in to add the new nodes to React Flow.
   */
  onToolResult?: (payload: ToolResultPayload) => void;
}

interface UseStreamingChatReturn {
  messages: LocalMessage[];
  isLoading: boolean;
  /** Name of the tool currently executing, or null. */
  toolStatus: string | null;
  error: string | null;
  sessionId: string;
  send: (text: string, context?: string) => Promise<void>;
  clearError: () => void;
}

/* ── SSE event shapes ──────────────────────────────────────────────── */

interface SSEToken      { type: 'token';       text: string }
interface SSEToolStart  { type: 'tool_start';  name: string }
interface SSEToolResult { type: 'tool_result'; name: string; nodes: InfCanvasNode[]; edges: InfCanvasEdge[] }
interface SSEDone       { type: 'done';        message_id: string; usage?: unknown }
interface SSEError      { type: 'error';       message: string }
type SSEEvent = SSEToken | SSEToolStart | SSEToolResult | SSEDone | SSEError;

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Generate a simple random UUID v4-like string for fallback session IDs. */
function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Parse SSE frames from a raw text chunk buffer.
 * Returns [parsedEvents, remainingBuffer].
 * SSE events are delimited by double newlines; each line is "data: <json>".
 */
function parseSSEChunk(buffer: string): [SSEEvent[], string] {
  const events: SSEEvent[] = [];
  const frames = buffer.split('\n\n');
  const remaining = frames.pop() ?? ''; // last element is an incomplete frame

  for (const frame of frames) {
    for (const line of frame.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const json = trimmed.slice(5).trim();
      if (!json) continue;
      try {
        events.push(JSON.parse(json) as SSEEvent);
      } catch {
        // malformed JSON — skip this line
      }
    }
  }

  return [events, remaining];
}

/* ── Hook ───────────────────────────────────────────────────────────── */

/**
 * Manages a real-time SSE chat stream for a single ChatNode.
 *
 * Calls `POST /api/canvas/nodes/:nodeId/messages` and streams tokens
 * directly into the messages array so the UI renders text as it arrives.
 */
export function useStreamingChat(
  nodeId: string,
  options?: UseStreamingChatOptions,
): UseStreamingChatReturn {
  const [messages, setMessages] = useState<LocalMessage[]>(
    options?.initialMessages ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable session ID for this hook instance — provided externally or generated once.
  const sessionIdRef = useRef<string>(options?.sessionId ?? randomId());

  // Update sessionId ref if the caller provides one after mount (Task 7 wiring).
  if (options?.sessionId && options.sessionId !== sessionIdRef.current) {
    sessionIdRef.current = options.sessionId;
  }

  // AbortController for the active stream — allows cancellation.
  const abortRef = useRef<AbortController | null>(null);

  // When nodeId changes (e.g. linear view switches focus node), abort any
  // in-flight stream and reset messages so the new node starts clean.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages(options?.initialMessages ?? []);
    setIsLoading(false);
    setToolStatus(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const send = useCallback(
    async (text: string, context?: string) => {
      // Cancel any in-flight stream before starting a new one.
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      setError(null);
      setToolStatus(null);
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      const content = context ? `${context}\n\n${text}` : text;

      // Whether we have pushed the in-progress assistant bubble yet.
      let assistantBubblePushed = false;

      try {
        const response = await infStreamMessage(
          nodeId,
          content,
          sessionIdRef.current,
          signal,
        );

        if (!response.body) throw new Error('Response has no body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          // Flush remaining bytes from the decoder on stream end.
          buffer += done
            ? decoder.decode()
            : decoder.decode(value, { stream: true });

          const [sseEvents, remaining] = parseSSEChunk(buffer);
          buffer = remaining;

          if (done) break;

          for (const event of sseEvents) {
            switch (event.type) {
              case 'token': {
                if (!assistantBubblePushed) {
                  // First token: push the assistant bubble and stop the spinner.
                  setIsLoading(false);
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: event.text },
                  ]);
                  assistantBubblePushed = true;
                } else {
                  // Subsequent tokens: append to the last message in-place.
                  setMessages((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                    return copy;
                  });
                }
                break;
              }

              case 'tool_start': {
                setToolStatus(event.name);
                break;
              }

              case 'tool_result': {
                setToolStatus(null);
                options?.onToolResult?.({
                  name: event.name,
                  nodes: event.nodes ?? [],
                  edges: event.edges ?? [],
                });
                break;
              }

              case 'done': {
                // Stream complete — spinner is already off from first token.
                // If no tokens arrived (e.g. tool-only response), clear loading.
                setIsLoading(false);
                setToolStatus(null);
                break;
              }

              case 'error': {
                throw new Error(event.message);
              }
            }
          }
        }
      } catch (e: unknown) {
        // Ignore abort errors — user triggered the cancellation.
        if (e instanceof Error && e.name === 'AbortError') return;

        const msg =
          e instanceof Error ? e.message
            : typeof e === 'object' && e && 'message' in e
              ? String((e as { message: unknown }).message)
              : 'Failed to send message';

        setError(msg);

        if (assistantBubblePushed) {
          // Append error notice to the partial assistant message.
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              ...last,
              content: last.content + `\n\n*(Error — ${msg})*`,
            };
            return copy;
          });
        } else {
          // No tokens arrived — push a standalone error message.
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `*(Error — ${msg})*` },
          ]);
        }
      } finally {
        setIsLoading(false);
        setToolStatus(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId, options?.onToolResult],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    isLoading,
    toolStatus,
    error,
    sessionId: sessionIdRef.current,
    send,
    clearError,
  };
}
