'use client';

import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';

interface BranchSelectorProps {
  branches: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Displays a branch switcher for conversations with multiple response branches.
 * Currently shows UI only — branching logic depends on backend support.
 */
export function BranchSelector({ branches, currentIndex, onSelect }: BranchSelectorProps) {
  if (branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <GitBranch className="w-3 h-3 text-muted-foreground" />
      <button
        onClick={() => onSelect(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="p-0.5 hover:bg-muted rounded disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-3 h-3 text-secondary-text" />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {currentIndex + 1} / {branches.length}
      </span>
      <button
        onClick={() => onSelect(Math.min(branches.length - 1, currentIndex + 1))}
        disabled={currentIndex === branches.length - 1}
        className="p-0.5 hover:bg-muted rounded disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-3 h-3 text-secondary-text" />
      </button>
    </div>
  );
}
