'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Loader2, Bot, User, Sparkles } from 'lucide-react';
import type { ApiError, ChatMessage } from '@/lib/types';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';
import { AssistantMarkdown } from '@/components/chat/AssistantMarkdown';

/** Stable for SSR + client first paint — avoids hydration mismatch from Date in useState init. */
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your AI teaching assistant. I can help you explore readiness data, draft interventions, investigate concept relationships, generate reports, and more. What would you like to know?",
  timestamp: '',
};

export function ChatAssistant() {
  const { selectedExamId } = useExam();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(api.chatSessionStorageKey(selectedExamId));
    setChatSessionId(stored && stored.length > 0 ? stored : null);
  }, [selectedExamId]);

  const sendUserMessage = async (text: string) => {
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
        examId: selectedExamId,
      });
      setChatSessionId(sid);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(api.chatSessionStorageKey(selectedExamId), sid);
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
    if (!input.trim() || isLoading) return;
    await sendUserMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    'Show class readiness summary',
    'List top interventions',
    'How many students are struggling?',
    'Generate a report',
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-chart-2 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-50"
        title="Open AI Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-border flex flex-col transition-all ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[560px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary to-chart-2 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-card/10 rounded-lg transition-colors"
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5 text-white/70" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-card/10 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground'
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

          {/* Quick actions — only show when few messages */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
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

          {/* Input */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about readiness, interventions, students..."
                rows={1}
                className="flex-1 resize-none px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary max-h-20"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-lg bg-primary hover:bg-chart-2 text-white flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
