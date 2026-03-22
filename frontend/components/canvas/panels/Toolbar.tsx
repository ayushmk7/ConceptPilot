'use client';

import { useState } from 'react';
import { Plus, Settings, Download, FileText, Image, Code, MessageSquare } from 'lucide-react';

interface ToolbarProps {
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onAddNode: (type: 'chat' | 'document' | 'image' | 'artifact') => void;
  onToggleSettings: () => void;
}

export function Toolbar({
  workspaceName,
  onWorkspaceNameChange,
  onAddNode,
  onToggleSettings,
}: ToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const nodeOptions = [
    { type: 'chat' as const, label: 'Chat Node', icon: MessageSquare, description: 'AI conversation' },
    { type: 'document' as const, label: 'Document', icon: FileText, description: 'PDF or file viewer' },
    { type: 'image' as const, label: 'Image', icon: Image, description: 'Image or diagram' },
    { type: 'artifact' as const, label: 'Artifact', icon: Code, description: 'Code or generated content' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white rounded-full shadow-lg border border-border px-6 py-3 flex items-center gap-4">
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => onWorkspaceNameChange(e.target.value)}
          className="font-medium text-primary bg-transparent border-none outline-none max-w-[200px]"
        />

        <div className="h-6 w-px bg-border" />

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-md transition-colors"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Add</span>
          </button>

          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-lg shadow-lg border border-border py-2 min-w-[200px]">
                {nodeOptions.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      onAddNode(opt.type);
                      setShowAddMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <opt.icon className="w-4 h-4 text-secondary-text" />
                    <div>
                      <div className="text-sm text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="px-4 py-1.5 bg-accent text-primary rounded-md text-sm font-medium hover:bg-accent/90 transition-colors">
          Generate Study Content
        </button>

        <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
          <FileText className="w-4 h-4 text-primary" />
        </button>

        <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
          <Download className="w-4 h-4 text-primary" />
        </button>

        <button
          onClick={onToggleSettings}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
        >
          <Settings className="w-4 h-4 text-primary" />
        </button>
      </div>
    </div>
  );
}
