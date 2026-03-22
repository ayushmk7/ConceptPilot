'use client';

import { useState } from 'react';
import { AssistantMarkdown } from '@/components/chat/AssistantMarkdown';
import { GitBranch, Check } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  index: number;
  isSelected?: boolean;
  branchMode?: 'off' | 'manual';
  onBranchFromHere?: (index: number) => void;
  onToggleSelect?: (index: number) => void;
}

export function MessageBubble({
  role,
  content,
  index,
  isSelected,
  branchMode = 'off',
  onBranchFromHere,
  onToggleSelect,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} relative`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection checkbox in manual branch mode */}
      {branchMode === 'manual' && onToggleSelect && (
        <button
          onClick={() => onToggleSelect(index)}
          className={`self-start mt-1 mr-1.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-primary border-primary text-white'
              : 'border-input hover:border-primary'
          }`}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>
      )}

      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm relative ${
          isUser
            ? 'bg-sidebar-accent text-foreground'
            : 'bg-white border border-border text-foreground'
        } ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <AssistantMarkdown content={content} />
        )}

        {/* Branch-from-here action: right side for assistant, left side for user */}
        {hovered && branchMode === 'off' && onBranchFromHere && (
          <button
            onClick={() => onBranchFromHere(index)}
            className={`absolute top-1 p-1 bg-white border border-border rounded-md shadow-sm hover:bg-muted transition-colors ${
              isUser ? '-left-8' : '-right-8'
            }`}
            title="Branch from this message"
          >
            <GitBranch className="w-3.5 h-3.5 text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}
