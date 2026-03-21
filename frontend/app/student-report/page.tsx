'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentReportRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/report');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <p className="text-sm text-[#94A3B8]">Redirecting to student report...</p>
    </div>
  );
}
