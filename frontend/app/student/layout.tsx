import type { Metadata } from 'next';
import { StudentProvider } from '@/lib/student-context';

export const metadata: Metadata = {
  title: 'Student — ConceptPilot',
  description: 'Personal readiness, study plan, and uploads',
};

export default function StudentSectionLayout({ children }: { children: React.ReactNode }) {
  return <StudentProvider>{children}</StudentProvider>;
}
