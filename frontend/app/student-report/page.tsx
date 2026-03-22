'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentReportRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/report');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to student report...</p>
    </div>
  );
}
