'use client';

import { useRef, useState } from 'react';
import { Plus, Settings, Download, FileText, Image, Upload, X, Paperclip } from 'lucide-react';

export interface CanvasFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface ToolbarProps {
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onAddChat: () => void;
  files: CanvasFile[];
  onUploadFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  onToggleSettings: () => void;
}

export function Toolbar({
  workspaceName,
  onWorkspaceNameChange,
  onAddChat,
  files,
  onUploadFiles,
  onRemoveFile,
  onToggleSettings,
}: ToolbarProps) {
  const [showFilesMenu, setShowFilesMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return FileText;
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white rounded-full shadow-lg border border-[#E2E8F0] px-6 py-3 flex items-center gap-4">
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => onWorkspaceNameChange(e.target.value)}
          className="font-medium text-[#00274C] bg-transparent border-none outline-none max-w-[200px]"
        />

        <div className="h-6 w-px bg-[#E2E8F0]" />

        {/* Add Chat — direct click, enters placement mode */}
        <button
          onClick={onAddChat}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors"
        >
          <Plus className="w-4 h-4 text-[#00274C]" />
          <span className="text-sm font-medium text-[#00274C]">Add Chat</span>
        </button>

        <button className="px-4 py-1.5 bg-[#FFCB05] text-[#00274C] rounded-md text-sm font-medium hover:bg-[#FFCB05]/90 transition-colors">
          Generate Study Content
        </button>

        {/* Files dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilesMenu((v) => !v)}
            className={`p-1.5 rounded-md transition-colors relative ${
              showFilesMenu ? 'bg-[#E8EEF4]' : 'hover:bg-[#E8EEF4]'
            }`}
            title="Files"
          >
            <Paperclip className="w-4 h-4 text-[#00274C]" />
            {files.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFCB05] rounded-full text-[9px] font-bold text-[#00274C] flex items-center justify-center leading-none">
                {files.length}
              </span>
            )}
          </button>

          {showFilesMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilesMenu(false)} />
              <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-2 min-w-[260px]">
                <div className="px-4 py-1.5 border-b border-[#E2E8F0]">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Uploaded Files
                  </span>
                </div>

                {files.length === 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-[#94A3B8]">
                    No files uploaded yet
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto">
                    {files.map((f) => {
                      const Icon = getFileIcon(f.type);
                      return (
                        <div
                          key={f.id}
                          className="px-4 py-2 flex items-center gap-2.5 hover:bg-[#E8EEF4] transition-colors group"
                        >
                          <Icon className="w-4 h-4 text-[#4A5568] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-[#1A1A2E] truncate">{f.name}</div>
                            <div className="text-[10px] text-[#94A3B8]">{formatSize(f.size)}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFile(f.id);
                            }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#E2E8F0] transition-all"
                          >
                            <X className="w-3 h-3 text-[#94A3B8]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-[#E2E8F0] px-4 pt-2 pb-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#00274C] hover:bg-[#E8EEF4] rounded-md transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <button className="p-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors">
          <Download className="w-4 h-4 text-[#00274C]" />
        </button>

        <button
          onClick={onToggleSettings}
          className="p-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors"
        >
          <Settings className="w-4 h-4 text-[#00274C]" />
        </button>
      </div>
    </div>
  );
}
