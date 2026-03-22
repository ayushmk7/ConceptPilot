import type { Metadata } from 'next';
import '@/styles/index.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ConceptPilot - AI-Assisted Concept Readiness',
  description: 'AI-powered concept readiness analytics for instructors and students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
