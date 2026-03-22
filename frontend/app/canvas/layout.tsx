'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { Sidebar } from '@/components/Sidebar';
import { StudentTopNav } from '@/components/StudentTopNav';
import { StudentSidebar } from '@/components/StudentSidebar';
import { StudentProvider } from '@/lib/student-context';

function CanvasShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isStudent = searchParams.get('role') === 'student';

  const inner = (
    <div className="h-screen bg-background flex flex-col">
      {isStudent ? <StudentTopNav /> : <TopNav />}
      <div className="flex flex-1 min-h-0">
        {isStudent ? <StudentSidebar /> : <Sidebar />}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );

  return isStudent ? <StudentProvider>{inner}</StudentProvider> : inner;
}

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <CanvasShell>{children}</CanvasShell>
    </Suspense>
  );
}
