'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { ConceptGraphIcon } from '@/components/svg/ConceptGraphIcon';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/upload', label: 'Upload' },
    { path: '/graph', label: 'Graph' },
    { path: '/reports', label: 'Reports' },
    { path: '/suggestions', label: 'AI Review' },
    { path: '/canvas', label: 'Canvas', href: '/canvas?role=instructor' },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="h-14 bg-gradient-to-r from-[#00274C] to-[#0a3260] text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
      <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight mr-10">
        <ConceptGraphIcon size={22} className="text-white" />
        PreReq
      </Link>

      <div className="hidden sm:flex items-center mr-4">
        <span className="text-[10px] font-semibold text-[#FFCB05] tracking-wider bg-[#FFCB05]/15 px-2 py-0.5 rounded">
          INSTRUCTOR
        </span>
      </div>

      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            href={link.href ?? link.path}
            className={`relative px-3 py-4 rounded-t-md text-sm transition-colors whitespace-nowrap ${
              isActive(link.path) ? 'text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            {link.label}
            {isActive(link.path) && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FFCB05] rounded-full" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 transition-colors text-sm">
          EECS 280
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-[#FFCB05] flex items-center justify-center text-[#00274C] hover:ring-2 hover:ring-white/30 transition-all"
          >
            <User className="w-4 h-4" />
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-56 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-[#E2E8F0]">
                  <div className="text-sm font-medium text-[#1A1A2E]">{user?.name || 'Prof. Smith'}</div>
                  <div className="text-xs text-[#94A3B8]">{user?.email || 'smith@umich.edu'}</div>
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2"
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
