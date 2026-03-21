'use client';

import { StudentTopNav } from './StudentTopNav';
import { StudentSidebar } from './StudentSidebar';
import { ErrorBoundary } from './ErrorBoundary';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <StudentTopNav />
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
