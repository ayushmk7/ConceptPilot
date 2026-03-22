'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InstructorLayout } from '@/components/InstructorLayout';
import { StudentLayout } from '@/components/StudentLayout';
import { ChatAssistantPanel } from '@/components/ChatAssistantPanel';
import type { ChatSurface } from '@/lib/api';

function AssistantBody({ surface }: { surface: ChatSurface }) {
  const searchParams = useSearchParams();
  /** Live `?session=` so sidebar history links and client navigations always switch threads (do not strip URL — that raced hydration). */
  const sessionFromUrl = searchParams.get('session');
  const handoffProp = sessionFromUrl && sessionFromUrl.length > 0 ? sessionFromUrl : undefined;

  const inner = (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
        <p className="text-sm text-secondary-text mt-0.5">
          {surface === 'instructor'
            ? 'Teaching assistant for readiness, interventions, and reports.'
            : 'Study assistant for your readiness scores and review plan.'}
        </p>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <ChatAssistantPanel surface={surface} variant="fullpage" initialSessionId={handoffProp} />
      </div>
    </div>
  );

  if (surface === 'instructor') {
    return <InstructorLayout showChatDock={false}>{inner}</InstructorLayout>;
  }
  return <StudentLayout showChatDock={false}>{inner}</StudentLayout>;
}

export function AssistantFullPage({ surface }: { surface: ChatSurface }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AssistantBody surface={surface} />
    </Suspense>
  );
}
