'use client';

import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap } from 'lucide-react';

export function StudentTopNav() {
  return (
    <nav className="h-14 bg-gradient-to-r from-chart-2 to-chart-2 text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
      <Link href="/" className="flex items-center gap-2.5 mr-10">
        <Image src="/logo/conceptpilot-logo.png" alt="ConceptPilot logo" width={26} height={19} className="rounded-sm" />
        <span className="text-lg font-semibold tracking-tight">ConceptPilot</span>
      </Link>

      <div className="hidden sm:flex items-center mr-4">
        <span className="text-[10px] font-semibold text-chart-5 tracking-wider bg-chart-5/15 px-2 py-0.5 rounded">
          STUDENT
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-chart-5 flex items-center justify-center text-white">
          <GraduationCap className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
}
