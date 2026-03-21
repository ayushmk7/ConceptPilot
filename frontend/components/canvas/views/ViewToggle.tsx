'use client';

import { MessageSquare, Network } from 'lucide-react';

interface ViewToggleProps {
  view: 'canvas' | 'linear';
  onToggle: () => void;
}

export function ViewToggle({ view, onToggle }: ViewToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#00274C] text-white rounded-full shadow-lg hover:bg-[#1B365D] transition-all hover:scale-105 active:scale-95"
      title={view === 'canvas' ? 'Switch to linear chat view' : 'Switch to canvas view'}
    >
      {view === 'canvas' ? (
        <>
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium">Focus Chat</span>
        </>
      ) : (
        <>
          <Network className="w-4 h-4" />
          <span className="text-sm font-medium">View Canvas</span>
        </>
      )}
    </button>
  );
}
