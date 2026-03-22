'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X, Minimize2, Maximize2, Sparkles, SquareArrowOutUpRight } from 'lucide-react';
import type { ChatSurface } from '@/lib/api';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';
import { ChatAssistantPanel } from '@/components/ChatAssistantPanel';
import { getCachedStudentReport } from '@/lib/student-report';

export function ChatAssistant({ surface }: { surface: ChatSurface }) {
  const router = useRouter();
  const { selectedExamId } = useExam();
  const cachedReport = typeof window !== 'undefined' ? getCachedStudentReport() : null;

  const effectiveExamId = useMemo(() => {
    if (surface === 'student' && cachedReport?.exam_id) {
      return String(cachedReport.exam_id);
    }
    return selectedExamId;
  }, [surface, cachedReport?.exam_id, selectedExamId]);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openAssistantFullPage = () => {
    if (typeof window === 'undefined') return;
    const key = api.chatSessionStorageKey(effectiveExamId, surface);
    const sid = sessionStorage.getItem(key);
    const path = surface === 'instructor' ? '/assistant/instructor' : '/assistant/student';
    const qs = sid && sid.length > 0 ? `?session=${encodeURIComponent(sid)}` : '';
    router.push(`${path}${qs}`);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary to-chart-2 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-card/10 rounded-lg transition-colors"
            aria-label={isMinimized ? 'Restore assistant panel' : 'Minimize assistant panel'}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5 text-white/70" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
          <button
            type="button"
            onClick={openAssistantFullPage}
            className="p-1.5 hover:bg-card/10 rounded-lg transition-colors"
            title="Open AI Assistant full page"
            aria-label="Open AI Assistant full page"
          >
            <SquareArrowOutUpRight className="w-3.5 h-3.5 text-white/70" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-card/10 rounded-lg transition-colors"
            aria-label="Close assistant"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>

      {!isMinimized && <ChatAssistantPanel surface={surface} variant="dock" />}
    </div>
  );
}
