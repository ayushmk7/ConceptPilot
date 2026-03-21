'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { Sidebar } from '@/components/Sidebar';
import { StudentTopNav } from '@/components/StudentTopNav';
import { StudentSidebar } from '@/components/StudentSidebar';

type CanvasRole = 'instructor' | 'student';
const CANVAS_ROLE_KEY = 'canvas_role_preference';

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen bg-[#FAFBFC]" />}>
      <CanvasRoleLayout>{children}</CanvasRoleLayout>
    </Suspense>
  );
}

function CanvasRoleLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<CanvasRole>('instructor');
  const queryRole = searchParams.get('role');

  useEffect(() => {
    if (queryRole === 'student' || queryRole === 'instructor') {
      setRole(queryRole);
      localStorage.setItem(CANVAS_ROLE_KEY, queryRole);
      return;
    }

    const storedRole = localStorage.getItem(CANVAS_ROLE_KEY);
    if (storedRole === 'student' || storedRole === 'instructor') {
      setRole(storedRole);
    }
  }, [queryRole]);

  const isStudent = queryRole === 'student' || (queryRole !== 'instructor' && role === 'student');

  return (
    <div className="h-screen bg-[#FAFBFC] flex flex-col">
      {isStudent ? <StudentTopNav /> : <TopNav />}
      <div className="flex flex-1 min-h-0">
        {isStudent ? <StudentSidebar /> : <Sidebar />}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
