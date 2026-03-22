'use client';

import dynamic from 'next/dynamic';
import { StudentTopNav } from './StudentTopNav';
import { StudentSidebar } from './StudentSidebar';
import { ErrorBoundary } from './ErrorBoundary';

const ChatAssistant = dynamic(
  () => import('./ChatAssistant').then((m) => ({ default: m.ChatAssistant })),
  { ssr: false },
);

export function StudentLayout({
  children,
  showChatDock = true,
}: {
  children: React.ReactNode;
  showChatDock?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudentTopNav />
      <div className="flex flex-1 min-h-0">
        <StudentSidebar />
        <main className="flex-1 overflow-auto min-h-0 flex flex-col">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      {showChatDock ? <ChatAssistant surface="student" /> : null}
    </div>
  );
}
