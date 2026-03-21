'use client';

import { X } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="absolute top-16 right-4 z-20 w-[320px] bg-white rounded-xl shadow-xl border border-[#E2E8F0] overflow-hidden">
      <div className="h-12 bg-[#00274C] px-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Canvas Settings</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <label className="text-xs font-medium text-[#4A5568] uppercase tracking-wide">
            Grid
          </label>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-[#1A1A2E]">Snap to grid</span>
            <button className="w-9 h-5 bg-[#00274C] rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-[#1A1A2E]">Show grid</span>
            <button className="w-9 h-5 bg-[#00274C] rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
            </button>
          </div>
        </div>

        <div className="h-px bg-[#E2E8F0]" />

        <div>
          <label className="text-xs font-medium text-[#4A5568] uppercase tracking-wide">
            AI Model
          </label>
          <select className="mt-2 w-full px-3 py-2 border border-[#CBD5E1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#00274C]">
            <option>Claude Sonnet 4.5</option>
            <option>Claude Haiku 4.5</option>
          </select>
        </div>

        <div className="h-px bg-[#E2E8F0]" />

        <div>
          <label className="text-xs font-medium text-[#4A5568] uppercase tracking-wide">
            Edge Style
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {['Smooth', 'Step', 'Straight'].map((style) => (
              <button
                key={style}
                className="px-3 py-1.5 text-xs rounded-md border border-[#CBD5E1] text-[#1A1A2E] hover:bg-[#E8EEF4] transition-colors first:bg-[#E8EEF4] first:border-[#00274C]"
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
