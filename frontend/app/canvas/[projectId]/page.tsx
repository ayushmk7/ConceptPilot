'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft } from 'lucide-react';

import { ChatNode, type OnBranchCreate } from '@/components/canvas/ChatNode';
import { SmartEdge } from '@/components/canvas/edges/SmartEdge';
import { Toolbar, type CanvasFile } from '@/components/canvas/panels/Toolbar';
import { SettingsPanel } from '@/components/canvas/panels/SettingsPanel';
import { LinearChatView } from '@/components/canvas/views/LinearChatView';
import { ViewToggle } from '@/components/canvas/views/ViewToggle';
import { useCanvasEntrance } from '@/components/canvas/hooks/useCanvasEntrance';
import '@/components/canvas/animations/canvas-entrance.css';
import {
  loadCanvasProject,
  saveCanvasProject,
  type CanvasProject,
} from '@/lib/canvas-api';
import { useStreamingChat, type LocalMessage } from '@/components/canvas/hooks/useStreamingChat';

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'chat',
    position: { x: 250, y: 100 },
    style: { width: 420, height: 520 },
    data: { title: 'Study Session', skill: 'Tutor', messages: [] },
  },
];

const defaultEdges: Edge[] = [];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasPageInner />
    </ReactFlowProvider>
  );
}

function CanvasPageInner() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [workspaceName, setWorkspaceName] = useState('Untitled Workspace');
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'linear'>('canvas');
  const [activeFocusNodeId, setActiveFocusNodeId] = useState<string | null>(null);
  const [pendingBranch, setPendingBranch] = useState<{
    sourceNodeId: string;
    messages: LocalMessage[];
  } | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{ type: 'chat' } | null>(null);
  const [pendingLink, setPendingLink] = useState<{
    sourceNodeId: string;
    messages: LocalMessage[];
  } | null>(null);
  const [files, setFiles] = useState<CanvasFile[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { entranceClass, onInit: onCanvasInit } = useCanvasEntrance();
  const { screenToFlowPosition } = useReactFlow();

  /* ── Wrap onInit to also fit-view once (instead of reactive fitView prop) ── */
  const handleFlowInit = useCallback(
    (instance: ReactFlowInstance) => {
      onCanvasInit(instance);
      instance.fitView();
    },
    [onCanvasInit],
  );

  /* ── Placement-mode mouse tracking ── */
  const isPlacing = !!(pendingBranch || pendingAdd || pendingLink);
  useEffect(() => {
    if (!isPlacing) return;
    const onMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingBranch(null);
        setPendingAdd(null);
        setPendingLink(null);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPlacing]);

  /* ── Active chat node for linear view ── */
  const activeChatNode = useMemo(
    () => {
      if (activeFocusNodeId) {
        return nodes.find((n) => n.id === activeFocusNodeId && n.type === 'chat') ?? null;
      }
      return nodes.find((n) => n.type === 'chat') ?? null;
    },
    [nodes, activeFocusNodeId],
  );
  const activeChatId = activeChatNode?.id ?? 'linear-fallback';
  const linearChat = useStreamingChat(activeChatId);

  const toggleView = useCallback(() => {
    setViewMode((v) => {
      if (v === 'linear') setActiveFocusNodeId(null);
      return v === 'canvas' ? 'linear' : 'canvas';
    });
  }, []);

  /* ── Focus mode: per-node maximize ── */
  const handleFocusNode = useCallback((nodeId: string) => {
    setActiveFocusNodeId(nodeId);
    setViewMode('linear');
  }, []);

  /* ── Branch placement mode: start ── */
  const handleBranchPlaceStart = useCallback(
    (sourceNodeId: string, messages: LocalMessage[]) => {
      setPendingBranch({ sourceNodeId, messages });
    },
    [],
  );

  /* ── Delete node ── */
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges],
  );

  /* ── Link mode: start ── */
  const handleLinkStart = useCallback(
    (sourceNodeId: string, messages: LocalMessage[]) => {
      setPendingLink({ sourceNodeId, messages });
    },
    [],
  );

  /* ── Link mode: finalize on node click ── */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!pendingLink) return;
      // Cancel if clicking the source node itself
      if (node.id === pendingLink.sourceNodeId) {
        setPendingLink(null);
        return;
      }

      const { sourceNodeId, messages: linkMessages } = pendingLink;
      setPendingLink(null);

      // Create purple link edge
      setEdges((eds) => [
        ...eds,
        {
          id: `link-${sourceNodeId}-${node.id}-${Date.now()}`,
          source: sourceNodeId,
          target: node.id,
          type: 'smart',
          animated: true,
          style: { stroke: '#7C3AED', strokeWidth: 2.5 },
          data: { isLink: true },
        },
      ]);

      // Add linked context to target node
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            const existing: LocalMessage[] = (n.data as any).linkedContext ?? [];
            return {
              ...n,
              data: {
                ...n.data,
                linkedContext: [...existing, ...linkMessages],
              },
            };
          }
          return n;
        }),
      );
    },
    [pendingLink, setEdges, setNodes],
  );

  /* ── Edge types ── */
  const edgeTypes = useMemo(() => ({ smart: SmartEdge }), []);

  /* ── Node types ── */
  const nodeTypes = useMemo(
    () => ({ chat: ChatNode }),
    [],
  );

  /* ── Branch handler ──
   * Uses a ref so the function identity is stable (no infinite loops).
   * Reads current nodes via the setNodes callback form.
   */
  const branchRef = useRef<OnBranchCreate | null>(null);

  const stableBranchCreate: OnBranchCreate = useCallback(
    (sourceNodeId: string, messages: LocalMessage[]) => {
      branchRef.current?.(sourceNodeId, messages);
    },
    [],
  );

  branchRef.current = useCallback(
    (sourceNodeId: string, messages: LocalMessage[]) => {
      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
        const offsetX = sourceNode ? sourceNode.position.x + 460 : 500;
        const offsetY = sourceNode ? sourceNode.position.y + 40 : 200;

        const newId = `chat-branch-${Date.now()}`;
        const newNode: Node = {
          id: newId,
          type: 'chat',
          className: 'node-pop-in',
          position: { x: offsetX, y: offsetY },
          style: { width: 420, height: 520 },
          data: {
            title: `Branch from ${(sourceNode?.data as any)?.title ?? 'Chat'}`,
            skill: (sourceNode?.data as any)?.skill ?? 'Tutor',
            initialMessages: messages,
            onBranchCreate: stableBranchCreate,
            onBranchPlaceStart: handleBranchPlaceStart,
            onFocusNode: handleFocusNode,
            onLinkStart: handleLinkStart,
            onDeleteNode: handleDeleteNode,
            autoBranch: false,
          },
        };

        // Add edge separately (can't call setEdges inside setNodes callback)
        setTimeout(() => {
          setEdges((eds) => [
            ...eds,
            {
              id: `e-${sourceNodeId}-${newId}`,
              source: sourceNodeId,
              target: newId,
              type: 'smart',
              animated: true,
              style: { stroke: '#7C3AED', strokeWidth: 2 },
            },
          ]);
        }, 0);

        return [...currentNodes, newNode];
      });
    },
    [setNodes, setEdges, stableBranchCreate],
  );

  /* ── Placement mode: finalize on pane click (branch or add) ── */
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // If in link mode, clicking pane cancels linking
      if (pendingLink) {
        setPendingLink(null);
        return;
      }
      if (!pendingBranch && !pendingAdd) return;
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      if (pendingBranch) {
        const { sourceNodeId, messages } = pendingBranch;
        setPendingBranch(null);

        setNodes((currentNodes) => {
          const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
          const newId = `chat-branch-${Date.now()}`;
          const newNode: Node = {
            id: newId,
            type: 'chat',
            className: 'node-pop-in',
            position: flowPos,
            style: { width: 420, height: 520 },
            data: {
              title: `Branch from ${(sourceNode?.data as any)?.title ?? 'Chat'}`,
              skill: (sourceNode?.data as any)?.skill ?? 'Tutor',
              initialMessages: messages,
              onBranchCreate: stableBranchCreate,
              onBranchPlaceStart: handleBranchPlaceStart,
              onFocusNode: handleFocusNode,
              onLinkStart: handleLinkStart,
              onDeleteNode: handleDeleteNode,
              autoBranch: false,
            },
          };

          setTimeout(() => {
            setEdges((eds) => [
              ...eds,
              {
                id: `e-${sourceNodeId}-${newId}`,
                source: sourceNodeId,
                target: newId,
                type: 'smart',
                animated: true,
                style: { stroke: '#7C3AED', strokeWidth: 2 },
              },
            ]);
          }, 0);

          return [...currentNodes, newNode];
        });
      } else if (pendingAdd) {
        setPendingAdd(null);

        const newNode: Node = {
          id: `chat-${Date.now()}`,
          type: 'chat',
          className: 'node-pop-in',
          position: flowPos,
          style: { width: 420, height: 520 },
          data: {
            title: 'New Chat',
            skill: 'Tutor',
            messages: [],
            onBranchCreate: stableBranchCreate,
            onBranchPlaceStart: handleBranchPlaceStart,
            onFocusNode: handleFocusNode,
            onLinkStart: handleLinkStart,
            onDeleteNode: handleDeleteNode,
            autoBranch: false,
          },
        };
        setNodes((nds) => [...nds, newNode]);
      }
    },
    [pendingBranch, pendingAdd, pendingLink, screenToFlowPosition, setNodes, setEdges, stableBranchCreate, handleBranchPlaceStart, handleFocusNode, handleLinkStart],
  );

  /* ── Inject onBranchCreate into chat nodes once on mount ── */
  const hasInjectedRef = useRef(false);
  useEffect(() => {
    if (hasInjectedRef.current) return;
    hasInjectedRef.current = true;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'chat') {
          return {
            ...n,
            data: { ...n.data, onBranchCreate: stableBranchCreate, onBranchPlaceStart: handleBranchPlaceStart, onFocusNode: handleFocusNode, onLinkStart: handleLinkStart, onDeleteNode: handleDeleteNode },
          };
        }
        return n;
      }),
    );
  }, [setNodes, stableBranchCreate, handleFocusNode]);

  /* ── Load project from localStorage on mount ── */
  useEffect(() => {
    const saved = loadCanvasProject(projectId);
    if (saved) {
      setWorkspaceName(saved.name);
      if (saved.nodes.length > 0) {
        const startX = typeof window !== 'undefined' ? window.innerWidth / 2 - 200 : 500;
        const startY = typeof window !== 'undefined' ? window.innerHeight / 2 - 200 : 300;

        const loadedNodes = (saved.nodes as Node[]).map((n) => {
          const finalPos = n.position;
          const nodeObj = {
            ...n,
            position: { x: startX, y: startY },
          };
          if (n.type === 'chat') {
            return {
              ...nodeObj,
              data: { ...n.data, onBranchCreate: stableBranchCreate, onBranchPlaceStart: handleBranchPlaceStart, onFocusNode: handleFocusNode, onLinkStart: handleLinkStart, onDeleteNode: handleDeleteNode, _finalPosition: finalPos },
            };
          }
          return {
            ...nodeObj,
            data: { ...n.data, _finalPosition: finalPos }
          };
        });
        setNodes(loadedNodes);

        // Spread them out to their actual saved positions to trigger the transform transition
        setTimeout(() => {
          setNodes((nds) => nds.map(n => ({
            ...n,
            position: (n.data as any)._finalPosition || n.position
          })));
        }, 50);

        setEdges(
          saved.edges.map((e) => {
            const isLink = (e as any).data?.isLink || e.id.startsWith('link-');
            return {
              ...e,
              type: e.type || 'smart',
              animated: true,
              style: isLink
                ? { stroke: '#7C3AED', strokeWidth: 2.5 }
                : { stroke: '#CBD5E1', strokeWidth: 2 },
              data: isLink ? { isLink: true } : undefined,
            };
          }) as Edge[],
        );
      }

      // Load uploaded files
      const rawFiles = localStorage.getItem(`canvas_files_${projectId}`);
      if (rawFiles) {
        try { setFiles(JSON.parse(rawFiles)); } catch { /* ignore */ }
      }
    }
  }, [projectId, setNodes, setEdges, stableBranchCreate]);

  /* ── Auto-save on changes (debounced) ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const project: CanvasProject = {
        id: projectId,
        name: workspaceName,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type ?? 'chat',
          position: n.position,
          data: {
            title: (n.data as any)?.title,
            skill: (n.data as any)?.skill,
            autoBranch: (n.data as any)?.autoBranch,
            linkedContext: (n.data as any)?.linkedContext,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          data: e.data,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveCanvasProject(project);

      // Persist files alongside the project
      localStorage.setItem(`canvas_files_${projectId}`, JSON.stringify(files));

      // Update the project index
      const rawIndex = localStorage.getItem('canvas_projects_index');
      if (rawIndex) {
        const index = JSON.parse(rawIndex) as { id: string; name: string; updatedAt: string }[];
        const existing = index.find((p) => p.id === projectId);
        if (existing) {
          existing.name = workspaceName;
          existing.updatedAt = new Date().toISOString();
          localStorage.setItem('canvas_projects_index', JSON.stringify(index));
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges, workspaceName, projectId, files]);

  /* ── Connect handler ── */
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, type: 'smart' }, eds),
      );
    },
    [setEdges],
  );

  /* ── Add chat node (enters placement mode) ── */
  const addChat = useCallback(() => {
    setPendingAdd({ type: 'chat' });
  }, []);

  /* ── Files handlers ── */
  const handleUploadFiles = useCallback((fileList: FileList) => {
    const newFiles: CanvasFile[] = Array.from(fileList).map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      type: f.type,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /* ── Render ── */
  return (
    <div className="h-full w-full bg-[#FAFBFC] relative">
      {/* Back button */}
      <button
        onClick={() => router.push('/canvas')}
        className="absolute top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-md border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[#00274C]" />
      </button>

      {/* View toggle FAB */}
      <ViewToggle view={viewMode} onToggle={toggleView} />

      {viewMode === 'linear' ? (
        /* ── Linear chat view ── */
        <LinearChatView
          activeNode={activeChatNode}
          messages={linearChat.messages}
          isLoading={linearChat.isLoading}
          onSend={linearChat.send}
        />
      ) : (
        /* ── Canvas view ── */
        <>
          {/* Top toolbar */}
          <Toolbar
            workspaceName={workspaceName}
            onWorkspaceNameChange={setWorkspaceName}
            onAddChat={addChat}
            files={files}
            onUploadFiles={handleUploadFiles}
            onRemoveFile={handleRemoveFile}
            onToggleSettings={() => setShowSettings((v) => !v)}
          />

          {/* Collaborator avatars */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="flex items-center -space-x-1">
              {['JD', 'SK', 'AM'].map((initials, idx) => (
                <div
                  key={initials}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white"
                  style={{
                    backgroundColor: ['#3B82F6', '#16A34A', '#F59E0B'][idx],
                  }}
                  title={`User ${initials}`}
                >
                  {initials}
                </div>
              ))}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

          {/* React Flow canvas */}
          <ReactFlow
            className={`${entranceClass} ${isPlacing ? 'cursor-crosshair' : ''}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={handleFlowInit}
            onPaneClick={onPaneClick}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionRadius={80}
            connectionMode={ConnectionMode.Loose}
            nodeDragThreshold={5}
            defaultEdgeOptions={{
              type: 'smart',
              animated: true,
              style: { stroke: '#CBD5E1', strokeWidth: 2 },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={2.5}
              color="#94A3B8"
              style={{ backgroundColor: '#FAFBFC' }}
            />
            <Controls
              className="bg-white rounded-lg shadow-lg border border-[#E2E8F0]"
              showInteractive={false}
            />
            <MiniMap
              className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200"
              nodeColor="#00274C"
              maskColor="rgba(248, 250, 252, 0.7)"
              pannable={true}
              zoomable={true}
              position="bottom-right"
            />
          </ReactFlow>

          {/* Ghost node preview while in placement mode */}
          {isPlacing && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{ left: mousePos.x - 70, top: mousePos.y - 18 }}
            >
              <div className="px-4 py-2.5 bg-white rounded-full border-2 border-[#7C3AED] shadow-lg flex items-center gap-2 opacity-90">
                <div className="w-2 h-2 rounded-full bg-[#FFCB05]" />
                <span className="text-sm font-medium text-[#1A1A2E] whitespace-nowrap">
                  {pendingBranch ? 'New Branch' : pendingLink ? 'Link to Node' : 'New Chat'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] text-center mt-1">
                {pendingLink ? 'Click target node' : 'Click to place'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
