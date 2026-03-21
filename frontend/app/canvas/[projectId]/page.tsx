'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft } from 'lucide-react';

import { ChatNode, type OnBranchCreate } from '@/components/canvas/ChatNode';
import { DocumentNode } from '@/components/canvas/DocumentNode';
import { ImageNode } from '@/components/canvas/ImageNode';
import { ArtifactNode } from '@/components/canvas/ArtifactNode';
import { SmartEdge } from '@/components/canvas/edges/SmartEdge';
import { Toolbar } from '@/components/canvas/panels/Toolbar';
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
  {
    id: '2',
    type: 'document',
    position: { x: 700, y: 150 },
    data: { title: 'Lecture Notes.pdf', pages: 24 },
  },
];

const defaultEdges: Edge[] = [
  { id: 'e2-1', source: '2', target: '1', type: 'smart', animated: true },
];

/** Node types that feed INTO chat nodes (flow: resource → chat). */
const RESOURCE_TYPES = new Set(['document', 'image', 'artifact']);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CanvasPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [workspaceName, setWorkspaceName] = useState('Untitled Workspace');
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'linear'>('canvas');
  const { entranceClass, onInit: onCanvasInit } = useCanvasEntrance();

  /* ── Active chat node for linear view ── */
  const activeChatNode = useMemo(
    () => nodes.find((n) => n.type === 'chat') ?? null,
    [nodes],
  );
  const activeChatId = activeChatNode?.id ?? 'linear-fallback';
  const linearChat = useStreamingChat(activeChatId);

  const toggleView = useCallback(() => {
    setViewMode((v) => (v === 'canvas' ? 'linear' : 'canvas'));
  }, []);

  /* ── Edge types ── */
  const edgeTypes = useMemo(() => ({ smart: SmartEdge }), []);

  /* ── Node types ── */
  const nodeTypes = useMemo(
    () => ({
      chat: ChatNode,
      document: DocumentNode,
      image: ImageNode,
      artifact: ArtifactNode,
    }),
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
          position: { x: offsetX, y: offsetY },
          style: { width: 420, height: 520 },
          data: {
            title: `Branch from ${(sourceNode?.data as any)?.title ?? 'Chat'}`,
            skill: (sourceNode?.data as any)?.skill ?? 'Tutor',
            initialMessages: messages,
            onBranchCreate: stableBranchCreate,
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
            data: { ...n.data, onBranchCreate: stableBranchCreate },
          };
        }
        return n;
      }),
    );
  }, [setNodes, stableBranchCreate]);

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
              data: { ...n.data, onBranchCreate: stableBranchCreate, _finalPosition: finalPos },
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
          saved.edges.map((e) => ({
            ...e,
            type: e.type || 'smart',
            animated: true,
            style: { stroke: '#CBD5E1', strokeWidth: 2 },
          })) as Edge[],
        );
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
            pages: (n.data as any)?.pages,
            src: (n.data as any)?.src,
            alt: (n.data as any)?.alt,
            content: (n.data as any)?.content,
            language: (n.data as any)?.language,
            autoBranch: (n.data as any)?.autoBranch,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveCanvasProject(project);

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
  }, [nodes, edges, workspaceName, projectId]);

  /* ── Connect handler ──
   * Auto-swaps direction so the animated flow always goes
   * FROM document/image/artifact INTO the chat node.
   */
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        let { source, target } = params;

        // Look up node types
        const sourceNode = nodes.find((n) => n.id === source);
        const targetNode = nodes.find((n) => n.id === target);
        const sourceType = sourceNode?.type ?? '';
        const targetType = targetNode?.type ?? '';

        // If user dragged chat → resource, flip so resource → chat
        if (targetType && RESOURCE_TYPES.has(targetType) && sourceType === 'chat') {
          [source, target] = [target!, source!];
        }

        return addEdge(
          { ...params, source: source!, target: target!, type: 'smart' },
          eds,
        );
      });
    },
    [setEdges, nodes],
  );

  /* ── Add node ── */
  const addNode = useCallback(
    (type: 'chat' | 'document' | 'image' | 'artifact') => {
      const dataByType: Record<string, Record<string, unknown>> = {
        chat: {
          title: 'New Chat',
          skill: 'Tutor',
          messages: [],
          onBranchCreate: stableBranchCreate,
          autoBranch: false,
        },
        document: { title: 'New Document.pdf', pages: 12 },
        image: { title: 'New Image', src: '', alt: 'Uploaded image' },
        artifact: { title: 'New Artifact', content: '', language: 'text' },
      };
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 300 + 100,
        },
        ...(type === 'chat' ? { style: { width: 420, height: 520 } } : {}),
        data: dataByType[type],
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, stableBranchCreate],
  );

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
            onAddNode={addNode}
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
            className={entranceClass}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onCanvasInit}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionRadius={40}
            fitView
            defaultEdgeOptions={{
              type: 'smart',
              animated: true,
              style: { stroke: '#CBD5E1', strokeWidth: 2 },
            }}
          >
            <Background
              gap={20}
              size={1}
              color="#E2E8F0"
              style={{ backgroundColor: '#FAFBFC' }}
            />
            <Controls
              className="bg-white rounded-lg shadow-lg border border-[#E2E8F0]"
              showInteractive={false}
            />
            <MiniMap
              className="bg-white rounded-lg shadow-lg border border-[#E2E8F0]"
              nodeColor="#00274C"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </>
      )}
    </div>
  );
}
