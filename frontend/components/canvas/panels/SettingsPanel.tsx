'use client';

import { X } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="absolute top-16 right-4 z-20 w-[320px] bg-white rounded-xl shadow-xl border border-border overflow-hidden">
      <div className="h-12 bg-primary px-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Canvas Settings</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-card/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <label className="text-xs font-medium text-secondary-text uppercase tracking-wide">
            Grid
          </label>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-foreground">Snap to grid</span>
            <button className="w-9 h-5 bg-primary rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-foreground">Show grid</span>
            <button className="w-9 h-5 bg-primary rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <label className="text-xs font-medium text-secondary-text uppercase tracking-wide">
            AI Model
          </label>
          <select className="mt-2 w-full px-3 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-primary">
            <option>Claude Sonnet 4.5</option>
            <option>Claude Haiku 4.5</option>
          </select>
        </div>

        <div className="h-px bg-border" />

        <div>
          <label className="text-xs font-medium text-secondary-text uppercase tracking-wide">
            Edge Style
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {['Smooth', 'Step', 'Straight'].map((style) => (
              <button
                key={style}
                className="px-3 py-1.5 text-xs rounded-md border border-input text-foreground hover:bg-muted transition-colors first:bg-muted first:border-primary"
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
