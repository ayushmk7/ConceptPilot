import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, Minimize2 } from 'lucide-react';

export const DocumentNode = memo(({ data }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="px-4 py-3 bg-white rounded-lg border border-border shadow-md cursor-pointer hover:border-primary transition-all min-w-[100px]"
      >
        <Handle type="target" position={Position.Left} id="left" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="target" position={Position.Top} id="top" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <span className="text-xs font-medium text-foreground text-center">{data.title}</span>
          <span className="text-xs text-muted-foreground">{data.pages} pages</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-lg w-[350px]" style={{ height: '450px' }}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />

      <div className="h-10 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{data.title}</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5 text-secondary-text" />
        </button>
      </div>

      <div className="p-4 h-[350px] overflow-y-auto bg-muted nowheel nodrag">
        <div className="bg-white border border-border rounded p-4 mb-3">
          <div className="h-32 bg-muted rounded mb-2" />
          <div className="space-y-1">
            <div className="h-2 bg-border rounded w-full" />
            <div className="h-2 bg-border rounded w-5/6" />
            <div className="h-2 bg-border rounded w-4/6" />
          </div>
        </div>
        <div className="bg-white border border-border rounded p-4">
          <div className="h-32 bg-muted rounded mb-2" />
          <div className="space-y-1">
            <div className="h-2 bg-border rounded w-full" />
            <div className="h-2 bg-border rounded w-3/4" />
          </div>
        </div>
      </div>

      <div className="h-10 border-t border-border px-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Page 1 of {data.pages}</span>
      </div>
    </div>
  );
});

DocumentNode.displayName = 'DocumentNode';
