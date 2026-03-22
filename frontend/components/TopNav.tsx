'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';

export function TopNav() {
  return (
    <nav className="h-14 bg-gradient-to-r from-primary to-chart-2 text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
      <Link href="/" className="flex items-center gap-2.5 mr-10">
        <Image src="/logo/conceptpilot-logo.png" alt="ConceptPilot logo" width={26} height={19} className="rounded-sm" />
        <span className="text-lg font-semibold tracking-tight">ConceptPilot</span>
      </Link>

      <div className="hidden sm:flex items-center mr-4">
        <span className="text-[10px] font-semibold text-accent tracking-wider bg-accent/15 px-2 py-0.5 rounded">
          INSTRUCTOR
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary">
          <User className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
}
