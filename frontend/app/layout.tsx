import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import '@/styles/index.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

const sergioTrendy = localFont({
  src: '../public/fonts/SergioTrendy-Regular.woff',
  variable: '--font-sergio-trendy',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ConceptPilot - AI-Assisted Concept Readiness',
  description: 'AI-powered concept readiness analytics for instructors and students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${sergioTrendy.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
