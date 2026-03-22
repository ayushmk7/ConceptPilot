import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Assistant — ConceptPilot',
  description: 'Instructor AI assistant for readiness and interventions',
};

export default function AssistantInstructorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
