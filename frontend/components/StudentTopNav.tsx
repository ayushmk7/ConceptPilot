'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useStudentBootstrapOptional } from '@/lib/student-context';
import { buildStudentMenuItems } from '@/lib/student-nav';

export function StudentTopNav() {
  const pathname = usePathname();
  const boot = useStudentBootstrapOptional();
  const menuItems = buildStudentMenuItems(boot?.canvasProjectId);

  const isActive = (item: { path: string; exact?: boolean }) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path);

  return (
    <nav className="h-14 bg-gradient-to-r from-chart-2 to-chart-2 text-white flex items-center px-4 sm:px-6 sticky top-0 z-50 shadow-md">
      <div className="flex items-center md:hidden mr-2">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,280px)] p-0">
            <SheetHeader className="p-4 border-b border-border text-left">
              <SheetTitle className="text-foreground">Student navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2 gap-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.path}
                    href={item.href ?? item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-muted text-chart-2'
                        : 'text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <Link href="/" className="flex items-center gap-2.5 mr-6 sm:mr-10">
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
