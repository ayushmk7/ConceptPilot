import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Code, Minimize2, Copy, Check } from 'lucide-react';

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

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="px-4 py-2.5 bg-white rounded-full border border-border shadow-md cursor-pointer hover:border-primary transition-all min-w-[140px]"
      >
        <Handle type="target" position={Position.Left} id="left" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="target" position={Position.Top} id="top" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-medium text-foreground">{data.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-lg w-[420px]">
      <Handle type="target" position={Position.Left} id="left" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
      <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
      <Handle type="target" position={Position.Top} id="top" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />

      <div className="h-10 bg-zinc-900 rounded-t-lg px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-medium text-white">{data.title}</span>
          {data.language && (
            <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-white/70">
              {data.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyContent}
            className="p-1 hover:bg-card/10 rounded transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-card/10 rounded transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 p-4 rounded-b-lg max-h-[400px] overflow-y-auto nowheel nodrag">
        {data.content ? (
          <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap break-words">
            <code>{data.content}</code>
          </pre>
        ) : (
          <div className="text-center text-muted-foreground py-8">
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
