'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <CanvasAuthGate>{children}</CanvasAuthGate>
    </Suspense>
  );
}

function CanvasAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role !== 'instructor') {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'instructor') {
    return <div className="h-screen bg-background" />;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
