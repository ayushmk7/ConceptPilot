'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} relative ${
        branchMode === 'manual' && onToggleSelect ? 'cursor-pointer hover:bg-[#F1F5F9] -mx-1 px-1 py-0.5 rounded-lg transition-colors' : ''
      }`}
      onClick={branchMode === 'manual' && onToggleSelect ? () => onToggleSelect(index) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection checkbox in manual branch mode */}
      {branchMode === 'manual' && onToggleSelect && (
        <div
          className={`self-start mt-1 mr-1.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-[#00274C] border-[#00274C] text-white'
              : 'border-[#CBD5E1] group-hover:border-[#00274C]'
          }`}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </div>
      )}

      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm relative ${
          isUser
            ? 'bg-[#FFF8E1] text-[#1A1A2E]'
            : 'bg-white border border-[#E2E8F0] text-[#1A1A2E]'
        } ${isSelected ? 'ring-2 ring-[#00274C] ring-offset-1' : ''}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md text-xs !my-2"
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    );
                  }
                  return (
                    <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Branch-from-here action: right side for assistant, left side for user */}
        {hovered && branchMode === 'off' && onBranchFromHere && (
          <button
            onClick={() => onBranchFromHere(index)}
            className={`absolute top-1 p-1 bg-white border border-[#E2E8F0] rounded-md shadow-sm hover:bg-[#E8EEF4] transition-colors ${
              isUser ? '-left-8' : '-right-8'
            }`}
            title="Branch from this message"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#00274C]" />
          </button>
        )}
      </div>
    </div>
  );
}
