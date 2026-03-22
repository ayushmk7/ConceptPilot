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

      <div className="h-10 bg-[#1E1E2E] rounded-t-xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#7C3AED]" />
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
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>

      <div className="bg-[#1E1E2E] p-4 rounded-b-xl max-h-[400px] overflow-y-auto nowheel nodrag">
        {data.content ? (
          <pre className="text-sm text-[#D4D4D8] font-mono whitespace-pre-wrap break-words">
            <code>{data.content}</code>
          </pre>
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
