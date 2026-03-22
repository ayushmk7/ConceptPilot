'use client';

import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createChatSession,
  sendMessage,
  type CanvasChatSurface,
} from '@/lib/canvas-api';
import { useExam } from '@/lib/exam-context';
import { getCachedStudentReport, getStoredStudentToken } from '@/lib/student-report';

export interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseStreamingChatOptions {
  /** Pre-seed the conversation (used when branching from another node). */
  initialMessages?: LocalMessage[];
  /** Override exam scope for chat tools (defaults to selected exam or cached student report). */
  examId?: string;
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
 * On canvas with `?role=student`, uses the student chat lane when a report token
 * is present in localStorage; otherwise send fails with a clear error.
 */
export function useStreamingChat(
  _nodeId: string,
  options?: UseStreamingChatOptions,
): UseStreamingChatReturn {
  const searchParams = useSearchParams();
  const { selectedExamId } = useExam();
  const isStudentCanvas = searchParams.get('role') === 'student';
  const reportToken = typeof window !== 'undefined' ? getStoredStudentToken() : null;
  const cached = typeof window !== 'undefined' ? getCachedStudentReport() : null;

  const examIdForChat =
    options?.examId ??
    (isStudentCanvas && cached?.exam_id ? String(cached.exam_id) : selectedExamId ?? undefined);

  const surface: CanvasChatSurface =
    isStudentCanvas && reportToken ? 'student' : 'instructor';

  const studentCanvasBlocked = isStudentCanvas && !reportToken;

  const [messages, setMessages] = useState<LocalMessage[]>(
    options?.initialMessages ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (studentCanvasBlocked) {
      throw new Error('Open your report link to enable chat on the student canvas.');
    }
    const session = await createChatSession(examIdForChat, {
      surface,
      reportToken: surface === 'student' ? reportToken : null,
    });
    sessionIdRef.current = session.id;
    return session.id;
  }, [examIdForChat, surface, reportToken, studentCanvasBlocked]);

  const send = useCallback(
    async (text: string, context?: string) => {
      setError(null);
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      const messageForApi = context ? `${context}\n\n${text}` : text;

      try {
        const sid = await ensureSession();
        const res = await sendMessage(sid, messageForApi, examIdForChat, { surface });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.assistant_message },
        ]);
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === 'object' && e && 'message' in e
              ? String((e as { message: unknown }).message)
              : 'Failed to send message';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              studentCanvasBlocked
                ? 'Open your personal report link in this browser to use the student study assistant on the canvas.'
                : `*(Error — ${msg})*`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureSession, examIdForChat, surface, studentCanvasBlocked],
  );

  const clearError = useCallback(() => setError(null), []);

  return { messages, isLoading, error, sessionId: sessionIdRef.current, send, clearError };
}
