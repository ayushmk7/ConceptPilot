import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/index.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PreReq - AI-Assisted Concept Readiness',
  description: 'AI-powered concept readiness analytics for instructors and students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
