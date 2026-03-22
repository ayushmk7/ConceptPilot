'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { MessageSquare, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { ChatSurface } from '@/lib/api';
import { fetchChatSessions, type ChatSessionApi } from '@/lib/api';
import { useStudentBootstrapOptional } from '@/lib/student-context';

function formatSessionLabel(s: ChatSessionApi): string {
  const t = (s.title ?? '').trim();
  if (t.length > 0) return t;
  const d = new Date(s.updated_at);
  if (Number.isNaN(d.getTime())) return 'Conversation';
  return `Chat · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

type AssistantHistoryNavProps = {
  surface: ChatSurface;
  isCollapsed: boolean;
  examId?: string | null;
  variant: 'instructor' | 'student';
};

function AssistantHistoryNavInner({ surface, isCollapsed, examId, variant }: AssistantHistoryNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = surface === 'instructor' ? '/assistant/instructor' : '/assistant/student';
  const assistantActive =
    surface === 'instructor' ? pathname.startsWith('/assistant/instructor') : pathname.startsWith('/assistant/student');
  const currentSessionId = searchParams.get('session');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boot = useStudentBootstrapOptional();
  const studentExamId = surface === 'student' ? boot?.examId ?? null : null;
  const studentBlocked =
    surface === 'student' && (boot?.loading || !!boot?.error || !String(studentExamId ?? '').trim());

  const loadSessions = useCallback(async () => {
    if (studentBlocked) {
      setSessions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchChatSessions({
        surface,
        examId: surface === 'instructor' ? examId : studentExamId,
        reportToken: null,
      });
      setSessions(rows);
    } catch (e) {
      setSessions([]);
      setError(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [surface, examId, studentExamId, studentBlocked]);

  useEffect(() => {
    if (!historyOpen || isCollapsed) return;
    void loadSessions();
  }, [historyOpen, isCollapsed, loadSessions]);

  const instructorActive =
    variant === 'instructor'
      ? 'bg-sidebar-accent text-primary shadow-sm border border-accent/20'
      : '';
  const instructorIdle =
    variant === 'instructor'
      ? 'text-secondary-text hover:bg-card hover:shadow-sm border border-transparent'
      : '';

  const studentActive =
    variant === 'student' ? 'bg-muted text-chart-2 shadow-sm border border-chart-5/20' : '';
  const studentIdle =
    variant === 'student' ? 'text-secondary-text hover:bg-card hover:shadow-sm border border-transparent' : '';

  const rowActive = variant === 'instructor' ? instructorActive : studentActive;
  const rowIdle = variant === 'instructor' ? instructorIdle : studentIdle;
  const iconActiveClass = variant === 'instructor' ? 'text-primary' : 'text-chart-5';
  const iconIdleClass = 'text-muted-foreground';

  if (isCollapsed) {
    return (
      <div className="px-2">
        <Link
          href={basePath}
          className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
            assistantActive ? rowActive : rowIdle
          }`}
          title="AI Assistant"
        >
          <MessageSquare className={`w-5 h-5 flex-shrink-0 ${assistantActive ? iconActiveClass : iconIdleClass}`} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      <div
        className={`flex items-center gap-0.5 rounded-lg border border-transparent ${
          assistantActive ? rowActive : rowIdle
        }`}
      >
        <Link
          href={basePath}
          className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2 rounded-lg transition-colors"
        >
          <MessageSquare className={`w-5 h-5 flex-shrink-0 ${assistantActive ? iconActiveClass : iconIdleClass}`} />
          <span className="text-sm font-medium truncate">AI Assistant</span>
        </Link>
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          aria-expanded={historyOpen}
          aria-label={historyOpen ? 'Hide chat history' : 'Show chat history'}
          title="Chat history"
        >
          {historyOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {historyOpen && (
        <div className="pl-2 pr-1 pb-1 border-l border-border/60 ml-4 space-y-0.5 max-h-56 overflow-y-auto">
          {studentBlocked && (
            <p className="text-[11px] text-muted-foreground px-2 py-1.5 leading-snug">
              {boot?.loading ? 'Loading workspace…' : boot?.error ? boot.error : 'Student workspace unavailable.'}
            </p>
          )}
          {!studentBlocked && loading && (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          )}
          {!studentBlocked && !loading && error && (
            <p className="text-[11px] text-destructive px-2 py-1">{error}</p>
          )}
          {!studentBlocked && !loading && !error && sessions.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-2 py-1.5">No conversations yet.</p>
          )}
          {!studentBlocked &&
            !loading &&
            !error &&
            sessions.map((s) => {
              const href = `${basePath}?session=${encodeURIComponent(s.id)}`;
              const isCurrent = currentSessionId === s.id;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={`block text-xs px-2 py-1.5 rounded-md truncate transition-colors ${
                    isCurrent
                      ? variant === 'instructor'
                        ? 'bg-sidebar-accent/80 text-primary font-medium'
                        : 'bg-muted text-chart-2 font-medium'
                      : 'text-secondary-text hover:bg-muted/60'
                  }`}
                  title={formatSessionLabel(s)}
                >
                  {formatSessionLabel(s)}
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}

function AssistantHistoryNavFallback({ isCollapsed, variant }: Pick<AssistantHistoryNavProps, 'isCollapsed' | 'variant'>) {
  const basePath = variant === 'instructor' ? '/assistant/instructor' : '/assistant/student';
  if (isCollapsed) {
    return (
      <div className="px-2">
        <Link
          href={basePath}
          className="flex items-center justify-center px-3 py-2 rounded-lg text-secondary-text hover:bg-card border border-transparent"
          title="AI Assistant"
        >
          <MessageSquare className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        </Link>
      </div>
    );
  }
  return (
    <div className="h-10 px-2 flex items-center gap-2 text-xs text-muted-foreground">
      <MessageSquare className="w-5 h-5 shrink-0" />
      <span className="truncate">AI Assistant</span>
    </div>
  );
}

export function AssistantHistoryNav(props: AssistantHistoryNavProps) {
  return (
    <Suspense fallback={<AssistantHistoryNavFallback isCollapsed={props.isCollapsed} variant={props.variant} />}>
      <AssistantHistoryNavInner {...props} />
    </Suspense>
  );
}
