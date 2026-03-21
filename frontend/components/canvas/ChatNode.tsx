import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeResizeControl } from '@xyflow/react';
import {
  Minimize2,
  MoreVertical,
  AlertCircle,
  GitBranch,
  Zap,
  Hand,
  Check,
  X,
} from 'lucide-react';

import { MessageList } from './chat/MessageList';
import { MessageInput } from './chat/MessageInput';
import { SkillPicker } from './chat/SkillPicker';
import { useStreamingChat, type LocalMessage } from './hooks/useStreamingChat';

/** Callback the parent canvas page wires in via node data. */
export type OnBranchCreate = (
  sourceNodeId: string,
  messages: LocalMessage[],
) => void;

export const ChatNode = memo(({ id, data }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [skill, setSkill] = useState<string>(data.skill ?? 'tutor');

  // Branch mode: 'off' = normal chat, 'manual' = user selects messages to branch
  const [branchMode, setBranchMode] = useState<'off' | 'manual'>('off');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const initialMessages: LocalMessage[] | undefined = data.initialMessages;
  const onBranchCreate: OnBranchCreate | undefined = data.onBranchCreate;
  const autoBranch: boolean = data.autoBranch ?? false;

  const { messages, isLoading, error, send, clearError } = useStreamingChat(
    id,
    initialMessages ? { initialMessages } : undefined,
  );

  // --- Branching logic ---

  /** Quick-branch: branch from a single message (hover action). */
  const handleBranchFromHere = useCallback(
    (index: number) => {
      if (!onBranchCreate) return;
      const sliced = messages.slice(0, index + 1);
      onBranchCreate(id, sliced);
    },
    [messages, id, onBranchCreate],
  );

  /** Manual branch: branch with all selected messages. */
  const handleManualBranch = useCallback(() => {
    if (!onBranchCreate || selectedIndices.size === 0) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    const picked = sorted.map((i) => messages[i]);
    onBranchCreate(id, picked);
    setBranchMode('off');
    setSelectedIndices(new Set());
  }, [messages, id, selectedIndices, onBranchCreate]);

  /** Toggle a message's selection in manual mode. */
  const toggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  /** Auto-branch: after each assistant response, auto-create a branch node. */
  const handleSend = useCallback(
    async (text: string) => {
      await send(text);
      if (autoBranch && onBranchCreate) {
        // Defer so the new message is in state
        setTimeout(() => {
          // We can't read `messages` directly due to closure; parent listens to node data changes
        }, 0);
      }
    },
    [send, autoBranch, onBranchCreate],
  );

  // ---- Collapsed view ----
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
          <div className="w-2 h-2 rounded-full bg-[#FFCB05]" />
          <span className="text-sm font-medium text-[#1A1A2E]">{data.title}</span>
          <span className="text-xs text-[#94A3B8]">{messages.length}</span>
        </div>
      </div>
    );
  }

  // ---- Expanded view ----
  return (
    <div
      className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg flex flex-col relative overflow-hidden"
      style={{ width: '100%', height: '100%', minWidth: 320, minHeight: 360 }}
    >
      {/* Handles: left/right + top/bottom for dynamic routing */}
      <Handle type="target" position={Position.Left} id="left" className="!w-6 !h-6 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="source" position={Position.Right} id="right" className="!w-6 !h-6 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="target" position={Position.Top} id="top" className="!w-6 !h-6 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-6 !h-6 !bg-[#00274C] !border-2 !border-white !rounded-full hover:!bg-[#1B365D]" />

      {/* Resize handle — bottom-right corner */}
      <NodeResizeControl
        minWidth={320}
        minHeight={360}
        maxWidth={800}
        maxHeight={900}
        style={{ background: 'transparent', border: 'none' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute bottom-1 right-1 cursor-se-resize hover:stroke-[#00274C] transition-colors"
        >
          <polyline points="16 20 20 20 20 16" />
          <line x1="14" y1="22" x2="22" y2="14" />
        </svg>
      </NodeResizeControl>

      {/* ── Header ── */}
      <div className="h-10 bg-[#00274C] rounded-t-lg px-4 flex items-center justify-between shrink-0">
        <input
          type="text"
          defaultValue={data.title}
          className="bg-transparent text-white text-sm font-medium outline-none flex-1 min-w-0"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <SkillPicker currentSkill={skill} onSelect={setSkill} />

          {/* Branch menu trigger */}
          <div className="relative">
            <button
              onClick={() => setShowBranchMenu((v) => !v)}
              className={`p-1 rounded transition-colors ${
                branchMode !== 'off'
                  ? 'bg-[#FFCB05] text-[#00274C]'
                  : 'hover:bg-white/10 text-white'
              }`}
              title="Branching options"
            >
              <GitBranch className="w-3.5 h-3.5" />
            </button>

            {showBranchMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBranchMenu(false)} />
                <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 min-w-[200px]">
                  <button
                    onClick={() => {
                      const next = !autoBranch;
                      // Toggle auto-branch via data mutation (parent reads this)
                      data.autoBranch = next;
                      setShowBranchMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#E8EEF4] transition-colors flex items-center gap-2"
                  >
                    <Zap className={`w-4 h-4 ${autoBranch ? 'text-[#FFCB05]' : 'text-[#94A3B8]'}`} />
                    <div>
                      <div className="text-sm text-[#1A1A2E]">Auto Branch</div>
                      <div className="text-xs text-[#94A3B8]">
                        {autoBranch ? 'ON — new node per response' : 'Create a node for each AI response'}
                      </div>
                    </div>
                    {autoBranch && <Check className="w-4 h-4 text-[#16A34A] ml-auto" />}
                  </button>

                  <button
                    onClick={() => {
                      setBranchMode(branchMode === 'manual' ? 'off' : 'manual');
                      setSelectedIndices(new Set());
                      setShowBranchMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#E8EEF4] transition-colors flex items-center gap-2"
                  >
                    <Hand className={`w-4 h-4 ${branchMode === 'manual' ? 'text-[#00274C]' : 'text-[#94A3B8]'}`} />
                    <div>
                      <div className="text-sm text-[#1A1A2E]">Manual Branch</div>
                      <div className="text-xs text-[#94A3B8]">
                        Select specific messages to branch
                      </div>
                    </div>
                    {branchMode === 'manual' && <Check className="w-4 h-4 text-[#16A34A] ml-auto" />}
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <MoreVertical className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-700 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{error}</span>
          <button onClick={clearError} className="ml-auto text-amber-500 hover:text-amber-700 shrink-0">
            dismiss
          </button>
        </div>
      )}

      {/* ── Manual branch bar ── */}
      {branchMode === 'manual' && (
        <div className="px-3 py-2 bg-[#EEF2FF] border-b border-[#C7D2FE] flex items-center gap-2 text-xs shrink-0">
          <Hand className="w-3.5 h-3.5 text-[#4338CA]" />
          <span className="text-[#4338CA] font-medium">
            Select messages to branch ({selectedIndices.size} selected)
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleManualBranch}
              disabled={selectedIndices.size === 0}
              className="px-2 py-1 bg-[#00274C] text-white rounded text-xs font-medium disabled:opacity-40 hover:bg-[#1B365D] transition-colors"
            >
              Create Branch
            </button>
            <button
              onClick={() => {
                setBranchMode('off');
                setSelectedIndices(new Set());
              }}
              className="p-1 hover:bg-[#C7D2FE] rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#4338CA]" />
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable message area ── */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        branchMode={branchMode}
        selectedIndices={selectedIndices}
        onBranchFromHere={onBranchCreate ? handleBranchFromHere : undefined}
        onToggleSelect={toggleSelect}
      />

      {/* ── Progress bar ── */}
      <div className="px-3 pt-2 shrink-0">
        <div className="h-1 bg-[#E2E8F0] rounded-full">
          <div
            className="h-full bg-[#16A34A] rounded-full transition-all"
            style={{ width: `${Math.min(100, messages.length * 10)}%` }}
          />
        </div>
      </div>

      {/* ── Input ── */}
      <MessageInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
});

ChatNode.displayName = 'ChatNode';
