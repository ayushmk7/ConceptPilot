'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { CornerDownLeft, Loader2, Bot, User } from 'lucide-react';
import type { ApiError, ChatMessage } from '@/lib/types';
import * as api from '@/lib/api';
import type { ChatSurface } from '@/lib/api';
import { useExam } from '@/lib/exam-context';
import { AssistantMarkdown } from '@/components/chat/AssistantMarkdown';
import { getCachedStudentReport } from '@/lib/student-report';
import { useStudentBootstrapOptional } from '@/lib/student-context';

const INSTRUCTOR_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your AI teaching assistant. I can help you explore readiness data, draft interventions, investigate concept relationships, generate reports, and more. What would you like to know?",
  timestamp: '',
};

const STUDENT_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your study assistant. I can explain your readiness scores, how concepts connect, and help you plan what to review next — using only your own results. What would you like to explore?",
  timestamp: '',
};

function mapApiRowToMessage(m: api.ChatSessionMessageApi): ChatMessage {
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content ?? '',
    timestamp: m.created_at,
  };
}

export type ChatAssistantPanelProps = {
  surface: ChatSurface;
  /** When a non-empty string (e.g. captured from `?session=`), seed session id for this tab. Omit in dock mode. */
  initialSessionId?: string;
  variant?: 'dock' | 'fullpage';
};

export function ChatAssistantPanel({ surface, initialSessionId, variant = 'dock' }: ChatAssistantPanelProps) {
  const { selectedExamId } = useExam();
  const cachedReport = typeof window !== 'undefined' ? getCachedStudentReport() : null;
  const studentBoot = useStudentBootstrapOptional();

  const effectiveExamId = useMemo(() => {
    if (surface === 'student' && studentBoot?.examId) {
      return String(studentBoot.examId);
    }
    if (surface === 'student' && cachedReport?.exam_id) {
      return String(cachedReport.exam_id);
    }
    return selectedExamId;
  }, [surface, studentBoot?.examId, cachedReport?.exam_id, selectedExamId]);

  const studentChatBlocked =
    surface === 'student' &&
    (studentBoot == null ||
      studentBoot.loading ||
      !!studentBoot.error ||
      !String(studentBoot.examId ?? '').trim());

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    surface === 'student' ? STUDENT_WELCOME : INSTRUCTOR_WELCOME,
  ]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(() => {
    const raw = typeof initialSessionId === 'string' ? initialSessionId.trim() : '';
    return raw.length > 0 ? raw : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handoff = typeof initialSessionId === 'string' ? initialSessionId.trim() : '';
    if (handoff.length > 0) {
      sessionStorage.setItem(api.chatSessionStorageKey(effectiveExamId, surface), handoff);
      setChatSessionId(handoff);
      return;
    }
    const stored = sessionStorage.getItem(api.chatSessionStorageKey(effectiveExamId, surface));
    setChatSessionId(stored && stored.length > 0 ? stored : null);
  }, [effectiveExamId, surface, initialSessionId]);

  /** Full-page: clear transcript when switching `?session=` from sidebar history (avoids showing the previous thread). */
  useEffect(() => {
    if (variant !== 'fullpage') return;
    const h = typeof initialSessionId === 'string' ? initialSessionId.trim() : '';
    if (h.length === 0) return;
    setMessages([surface === 'student' ? STUDENT_WELCOME : INSTRUCTOR_WELCOME]);
  }, [initialSessionId, surface, variant]);

  useEffect(() => {
    if (typeof window === 'undefined' || !chatSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.fetchChatSessionMessages(chatSessionId);
        if (cancelled) return;
        const mapped = rows.map(mapApiRowToMessage);
        const w = surface === 'student' ? STUDENT_WELCOME : INSTRUCTOR_WELCOME;
        setMessages(mapped.length > 0 ? mapped : [w]);
      } catch {
        if (cancelled) return;
        sessionStorage.removeItem(api.chatSessionStorageKey(effectiveExamId, surface));
        setChatSessionId(null);
        setMessages([surface === 'student' ? STUDENT_WELCOME : INSTRUCTOR_WELCOME]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatSessionId, effectiveExamId, surface]);

  const quickActions =
    surface === 'student'
      ? [
          'Summarize my weakest concepts',
          'How does the concept graph work?',
          'What should I study first?',
        ]
      : [
          'Show class readiness summary',
          'List top interventions',
          'How many students are struggling?',
          'Generate a report',
        ];

  const sendUserMessage = async (text: string) => {
    if (studentChatBlocked) return;
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { message: reply, sessionId: sid } = await api.sendChatMessage(trimmed, {
        sessionId: chatSessionId,
        examId: effectiveExamId,
        surface,
        reportToken: null,
      });
      setChatSessionId(sid);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(api.chatSessionStorageKey(effectiveExamId, surface), sid);
      }
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'message' in err && typeof (err as ApiError).message === 'string'
          ? (err as ApiError).message
          : 'Sorry, I encountered an error. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: detail,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || studentChatBlocked) return;
    await sendUserMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const rootClass =
    variant === 'fullpage'
      ? 'flex flex-col flex-1 min-h-0 bg-white rounded-2xl border border-border shadow-sm overflow-hidden'
      : 'flex flex-col flex-1 min-h-0 overflow-hidden';

  return (
    <div className={rootClass}>
      {studentChatBlocked && surface === 'student' && (
        <div className="px-4 py-2 text-xs text-amber-900 bg-amber-50 border-b border-amber-100 flex-shrink-0">
          {studentBoot?.loading
            ? 'Connecting to the shared study workspace…'
            : studentBoot?.error
              ? `Could not load student context: ${studentBoot.error}`
              : 'Student workspace is not ready yet.'}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-hidden">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <AssistantMarkdown content={msg.content} />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && !studentChatBlocked && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => void sendUserMessage(action)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-secondary-text hover:bg-muted/50 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              surface === 'student'
                ? 'Ask about your readiness and study plan...'
                : 'Ask about readiness, interventions, students...'
            }
            rows={variant === 'fullpage' ? 2 : 1}
            disabled={studentChatBlocked}
            className="flex-1 resize-none px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary max-h-32 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || studentChatBlocked}
            className="w-9 h-9 rounded-lg bg-primary hover:bg-chart-2 text-white flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
