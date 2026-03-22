import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Assistant — ConceptPilot',
  description: 'Student study assistant for readiness and review planning',
};

export default function AssistantStudentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
