import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Image, Minimize2, Maximize2 } from 'lucide-react';

export const ImageNode = memo(({ data }: any) => {
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
          <Image className="w-8 h-8 text-primary" />
          <span className="text-xs font-medium text-foreground text-center truncate max-w-[100px]">
            {data.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-lg w-[350px]">
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-primary !border-2 !border-white !rounded-full hover:!bg-chart-2" />

      <div className="h-10 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground truncate">{data.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-secondary-text" />
          </button>
        </div>
      </div>

      <div className="p-4 min-h-[200px] flex items-center justify-center bg-muted">
        {data.src ? (
          <img
            src={data.src}
            alt={data.alt || data.title}
            className="max-w-full max-h-[300px] rounded object-contain"
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No image loaded</p>
            <p className="text-xs mt-1">Drag & drop or upload a file</p>
          </div>
        )}
      </div>

      {data.alt && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{data.alt}</p>
        </div>
      )}
    </div>
  );
});

ImageNode.displayName = 'ImageNode';
