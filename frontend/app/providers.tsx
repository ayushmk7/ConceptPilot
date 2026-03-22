'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ExamProvider } from '@/lib/exam-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ExamProvider>{children}</ExamProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
