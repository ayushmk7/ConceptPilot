'use client';

import 'katex/dist/katex.min.css';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

interface AssistantMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Assistant replies: GitHub-flavored markdown, fenced code, and LaTeX via KaTeX
 * ($inline$, $$display$$, \\( \\), \\[ \\]).
 */
export function AssistantMarkdown({ content, className }: AssistantMarkdownProps) {
  return (
    <div
      className={clsx(
        'overflow-x-auto max-w-none prose prose-sm prose-p:my-1 prose-pre:my-2',
        '[&_.katex-display]:overflow-x-auto [&_.katex-display]:my-2',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          code({ className: codeClass, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClass || '');
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
              <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
