'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, FileText, Sparkles, MessageSquare, ChevronRight, ChevronLeft, GitBranch } from 'lucide-react';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/graph', label: 'Graph Editor', icon: GitBranch },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/suggestions', label: 'AI Suggestions', icon: Sparkles },
    { path: '/canvas', label: 'Canvas', icon: MessageSquare, href: '/canvas?role=instructor' },
  ];

  const isActive = (path: string) => (path === '/canvas' ? pathname.startsWith('/canvas') : pathname === path);

  return (
    <div className={`hidden md:flex bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border-r border-[#E2E8F0] transition-all duration-300 flex-col ${isCollapsed ? 'w-14' : 'w-60'}`}>
      <div className="flex-1 py-6">
        <div className="px-4 mb-6">
          <div className={`text-[10px] font-semibold text-[#94A3B8] tracking-widest mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            COURSE
          </div>
          <select className={`w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white shadow-sm ${isCollapsed ? 'hidden' : 'block'}`}>
            <option>EECS 280</option>
            <option>EECS 281</option>
          </select>
        </div>

        <div className="px-4 mb-6">
          <div className={`text-[10px] font-semibold text-[#94A3B8] tracking-widest mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            EXAM
          </div>
          <select className={`w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white shadow-sm ${isCollapsed ? 'hidden' : 'block'}`}>
            <option>Midterm 1</option>
            <option>Midterm 2</option>
            <option>Final</option>
          </select>
        </div>

        <div className={`text-[10px] font-semibold text-[#94A3B8] tracking-widest px-4 mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          QUICK LINKS
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.href ?? item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-[#FFF8E1] text-[#00274C] shadow-sm border border-[#FFCB05]/20'
                    : 'text-[#4A5568] hover:bg-white hover:shadow-sm border border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#00274C]' : 'text-[#94A3B8]'}`} />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Decorative network graphic */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <svg viewBox="0 0 180 60" className="w-full opacity-[0.06]" aria-hidden="true">
            <circle cx="30" cy="30" r="4" fill="currentColor" />
            <circle cx="90" cy="15" r="4" fill="currentColor" />
            <circle cx="150" cy="30" r="4" fill="currentColor" />
            <circle cx="60" cy="50" r="3" fill="currentColor" />
            <circle cx="120" cy="50" r="3" fill="currentColor" />
            <line x1="30" y1="30" x2="90" y2="15" stroke="currentColor" strokeWidth="1.5" />
            <line x1="90" y1="15" x2="150" y2="30" stroke="currentColor" strokeWidth="1.5" />
            <line x1="30" y1="30" x2="60" y2="50" stroke="currentColor" strokeWidth="1.5" />
            <line x1="150" y1="30" x2="120" y2="50" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3.5 border-t border-[#E2E8F0] hover:bg-[#E8EEF4] transition-colors flex items-center justify-center"
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-[#94A3B8]" />
        )}
      </button>
    </div>
  );
}
