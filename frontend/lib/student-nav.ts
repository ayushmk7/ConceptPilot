import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Upload,
  FileText,
  BookOpen,
  Headphones,
  GitBranch,
  PenLine,
  MessageSquare,
} from 'lucide-react';

export type StudentNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** When set (e.g. Canvas), overrides `path` for the link target */
  href?: string;
};

export function getStudentCanvasHref(canvasProjectId: string | undefined): string {
  return canvasProjectId ? `/canvas/${canvasProjectId}?role=student` : '/canvas?role=student';
}

export function buildStudentMenuItems(canvasProjectId: string | undefined): StudentNavItem[] {
  const canvasHref = getStudentCanvasHref(canvasProjectId);
  return [
    { path: '/student', label: 'Overview', icon: LayoutDashboard, exact: true },
    { path: '/student/upload', label: 'Upload', icon: Upload },
    { path: '/student/report', label: 'My Report', icon: FileText },
    { path: '/student/study-plan', label: 'Study Plan', icon: BookOpen },
    { path: '/student/study-content', label: 'Study Content', icon: Headphones },
    { path: '/student/graph', label: 'Knowledge Graph', icon: GitBranch, exact: true },
    { path: '/student/graph-structure', label: 'Graph structure', icon: PenLine, exact: true },
    { path: '/canvas', label: 'Canvas', icon: MessageSquare, href: canvasHref },
  ];
}
