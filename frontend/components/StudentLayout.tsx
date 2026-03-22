'use client';

import dynamic from 'next/dynamic';
import { StudentTopNav } from './StudentTopNav';
import { StudentSidebar } from './StudentSidebar';
import { ErrorBoundary } from './ErrorBoundary';

const ChatAssistant = dynamic(
  () => import('./ChatAssistant').then((m) => ({ default: m.ChatAssistant })),
  { ssr: false },
);

export function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudentTopNav />
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <ChatAssistant />
    </div>
  );
}
