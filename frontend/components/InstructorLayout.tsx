'use client';

import dynamic from 'next/dynamic';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';

const ChatAssistant = dynamic(
  () => import('./ChatAssistant').then((m) => ({ default: m.ChatAssistant })),
  { ssr: false },
);

export function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
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
