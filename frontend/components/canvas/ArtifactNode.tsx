import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Code, Minimize2, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* Map common language names to file extensions for the download filename. */
const LANG_EXT: Record<string, string> = {
  python: 'py', javascript: 'js', typescript: 'ts', tsx: 'tsx', jsx: 'jsx',
  java: 'java', c: 'c', cpp: 'cpp', rust: 'rs', go: 'go',
  css: 'css', html: 'html', json: 'json', yaml: 'yml', bash: 'sh', shell: 'sh',
  markdown: 'md', md: 'md', sql: 'sql', r: 'r',
};

function deriveFilename(title: string, language?: string): string {
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'artifact';
  const ext = language ? (LANG_EXT[language.toLowerCase()] ?? language.toLowerCase()) : 'md';
  return `${slug}.${ext}`;
}

export const ArtifactNode = memo(({ data }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyContent = () => {
    if (data.content) {
      navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadContent = () => {
    if (!data.content) return;
    const filename = deriveFilename(data.title ?? 'artifact', data.language);
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="px-4 py-2.5 bg-white rounded-full border border-[#E2E8F0] shadow-md cursor-pointer hover:border-[#00274C] transition-all min-w-[140px]"
      >
        <Handle type="target" position={Position.Left} id="left" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
        <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
        <Handle type="target" position={Position.Top} id="top" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-sm font-medium text-[#1A1A2E]">{data.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-lg w-[420px]">
      <Handle type="target" position={Position.Left} id="left" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="target" position={Position.Top} id="top" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />

      {/* Header */}
      <div className="h-10 bg-[#1E1E2E] rounded-t-xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Code className="w-4 h-4 text-[#7C3AED] shrink-0" />
          <span className="text-sm font-medium text-white truncate">{data.title}</span>
          {data.language && (
            <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-white/70 shrink-0">
              {data.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyContent}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Copy content"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
          <button
            onClick={downloadContent}
            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
            title={`Download as ${deriveFilename(data.title ?? 'artifact', data.language)}`}
            disabled={!data.content}
          >
            <Download className="w-3.5 h-3.5 text-white/70" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-xl max-h-[400px] overflow-y-auto nowheel nodrag">
        {data.content ? (
          <div className="p-4 prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:p-0">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
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
              {data.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center text-[#64748B] py-8">
            <Code className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Artifact will appear here</p>
            <p className="text-xs mt-1">Generated from tool results</p>
          </div>
        )}
      </div>
    </div>
  );
});

ArtifactNode.displayName = 'ArtifactNode';
