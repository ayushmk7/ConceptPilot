'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LogOut } from 'lucide-react';
import { ConceptGraphIcon } from '@/components/svg/ConceptGraphIcon';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export function StudentTopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navLinks = [
    { path: '/student', label: 'Overview', exact: true },
    { path: '/student/report', label: 'My Report' },
    { path: '/student/study-plan', label: 'Study Plan' },
    { path: '/student/study-content', label: 'Study Content' },
    { path: '/student/upload', label: 'Upload' },
    { path: '/canvas', label: 'Canvas', href: '/canvas?role=student' },
  ];

  const isActive = (link: { path: string; exact?: boolean }) =>
    link.exact ? pathname === link.path : pathname.startsWith(link.path);

  return (
    <nav className="h-14 bg-gradient-to-r from-chart-2 to-chart-2 text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
      <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight mr-10">
        <ConceptGraphIcon size={22} className="text-white" />
        PreReq
      </Link>

      <div className="hidden sm:flex items-center mr-4">
        <span className="text-[10px] font-semibold text-chart-5 tracking-wider bg-chart-5/15 px-2 py-0.5 rounded">
          STUDENT
        </span>
      </div>

      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            href={link.href ?? link.path}
            className={`relative px-3 py-4 rounded-t-md text-sm transition-colors whitespace-nowrap ${
              isActive(link) ? 'text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            {link.label}
            {isActive(link) && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-chart-5 rounded-full" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60 hidden sm:block">EECS 280 &bull; Midterm 1</span>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-chart-5 flex items-center justify-center text-white hover:ring-2 hover:ring-white/30 transition-all"
          >
            <GraduationCap className="w-4 h-4" />
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-xl border border-border w-56 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-sm font-medium text-foreground">{user?.name || 'Alex Johnson'}</div>
                  <div className="text-xs text-muted-foreground">{user?.email || 'ajohnson@umich.edu'}</div>
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
