'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useExam } from '@/lib/exam-context';
import { AssistantHistoryNav } from '@/components/AssistantHistoryNav';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const {
    courses,
    exams,
    selectedCourseId,
    selectedExamId,
    setSelectedCourseId,
    setSelectedExamId,
    loading: examLoading,
  } = useExam();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/suggestions', label: 'AI Suggestions', icon: Sparkles },
  ];

  const isActive = (path: string) => {
    if (path === '/canvas') return pathname.startsWith('/canvas');
    return pathname === path;
  };

  return (
    <div className={`hidden md:flex bg-gradient-to-b from-sidebar to-sidebar border-r border-border transition-all duration-300 flex-col ${isCollapsed ? 'w-14' : 'w-60'}`}>
      <div className="flex-1 py-6">
        <div className="px-4 mb-6">
          <div className={`text-[10px] font-semibold text-muted-foreground tracking-widest mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            COURSE
          </div>
          <select
            value={selectedCourseId ?? ''}
            onChange={(e) => setSelectedCourseId(e.target.value || null)}
            className={`w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm ${isCollapsed ? 'hidden' : 'block'}`}
          >
            <option value="" disabled>
              {examLoading ? 'Loading…' : courses.length === 0 ? 'No courses yet' : 'Select course'}
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="px-4 mb-6">
          <div className={`text-[10px] font-semibold text-muted-foreground tracking-widest mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            EXAM
          </div>
          <select
            value={selectedExamId ?? ''}
            onChange={(e) => setSelectedExamId(e.target.value || null)}
            className={`w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm ${isCollapsed ? 'hidden' : 'block'}`}
          >
            <option value="" disabled>
              {examLoading ? 'Loading…' : exams.length === 0 ? 'No exams yet' : 'Select exam'}
            </option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        <div className={`text-[10px] font-semibold text-muted-foreground tracking-widest px-4 mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          QUICK LINKS
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-primary shadow-sm border border-accent/20'
                    : 'text-secondary-text hover:bg-card hover:shadow-sm border border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
          <AssistantHistoryNav
            surface="instructor"
            variant="instructor"
            isCollapsed={isCollapsed}
            examId={selectedExamId}
          />
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
