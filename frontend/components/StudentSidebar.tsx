'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, FileText, BookOpen, Headphones, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';

export function StudentSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { path: '/student', label: 'Overview', icon: LayoutDashboard, exact: true },
    { path: '/student/report', label: 'My Report', icon: FileText },
    { path: '/student/study-plan', label: 'Study Plan', icon: BookOpen },
    { path: '/student/study-content', label: 'Study Content', icon: Headphones },
    { path: '/student/upload', label: 'Upload Test', icon: Upload },
    { path: '/canvas', label: 'Canvas', icon: MessageSquare, href: '/canvas?role=student' },
  ];

  const isActive = (item: { path: string; exact?: boolean }) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path);

  return (
    <div className={`hidden md:flex bg-gradient-to-b from-sidebar to-sidebar border-r border-border transition-all duration-300 flex-col ${isCollapsed ? 'w-14' : 'w-60'}`}>
      <div className="flex-1 py-6">
        <div className={`text-[10px] font-semibold text-muted-foreground tracking-widest px-4 mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          NAVIGATION
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                href={item.href ?? item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-muted text-chart-2 shadow-sm border border-chart-5/20'
                    : 'text-secondary-text hover:bg-card hover:shadow-sm border border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-chart-5' : 'text-muted-foreground'}`} />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Info box */}
        {!isCollapsed && (
          <div className="mx-4 mt-8 p-4 bg-muted rounded-xl border border-chart-5/10">
            <p className="text-xs font-medium text-chart-2 mb-1">Your readiness report</p>
            <p className="text-[11px] text-secondary-text leading-relaxed">
              This report is private to you. No peer comparisons or rankings are shown.
            </p>
          </div>
        )}
      </div>

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
        className="p-3.5 border-t border-border hover:bg-muted transition-colors flex items-center justify-center"
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
