'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';

const ReactFlowWithExtras = dynamic(
  () => import('@xyflow/react').then((m) => {
    require('@xyflow/react/dist/style.css');
    return {
      default: (props: any) => (
        <m.ReactFlow {...props}>
          {props.children}
          <m.Background
            gap={20} size={1}
            color={props._bgColor}
            style={{ backgroundColor: props._bgStyle }}
          />
          <m.Controls
            className="bg-white rounded-lg shadow-lg border border-border"
            showInteractive={false}
          />
          <m.MiniMap
            className="bg-white rounded-lg shadow-lg border border-border"
            nodeColor={props._miniMapNodeColor}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </m.ReactFlow>
      ),
    };
  }),
  { ssr: false },
);
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
  getCanvasWorkspace,
  updateCanvasWorkspace,
  type CanvasWorkspaceState,
} from '@/lib/canvas-api';
import { DEFAULT_CANVAS_EDGES, DEFAULT_CANVAS_NODES } from '@/lib/canvas-defaults';
import { themeColor } from '@/lib/theme-colors';
import { useStreamingChat, type LocalMessage } from '@/components/canvas/hooks/useStreamingChat';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Node types that feed INTO chat nodes (flow: resource → chat). */
const RESOURCE_TYPES = new Set(['document', 'image', 'artifact']);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CanvasPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleSuffix = searchParams.get('role') === 'student' ? '?role=student' : '';
  const projectId = params.projectId;

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_CANVAS_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_CANVAS_EDGES);
  const [workspaceName, setWorkspaceName] = useState('Untitled Workspace');
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'linear'>('canvas');
  const { entranceClass, onInit: onCanvasInit } = useCanvasEntrance();
  const saveAllowedRef = useRef(false);

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
              style: { stroke: themeColor.violet600, strokeWidth: 2 },
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

  /* ── Load workspace from API ── */
  useEffect(() => {
    if (!projectId) return;
    if (!UUID_RE.test(projectId)) {
      router.replace('/canvas');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getCanvasWorkspace(projectId);
        if (cancelled) return;
        setWorkspaceName(row.title);
        const saved = row.state as CanvasWorkspaceState;
        const hasNodes = saved?.nodes && saved.nodes.length > 0;
        if (hasNodes) {
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
              data: { ...n.data, _finalPosition: finalPos },
            };
          });
          setNodes(loadedNodes);

          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) => ({
                ...n,
                position: (n.data as { _finalPosition?: { x: number; y: number } })._finalPosition ?? n.position,
              })),
            );
          }, 50);

          setEdges(
            (saved.edges ?? []).map((e) => ({
              ...e,
              type: e.type || 'smart',
              animated: true,
              style: { stroke: themeColor.input, strokeWidth: 2, ...e.style },
            })) as Edge[],
          );
        } else {
          setNodes(
            DEFAULT_CANVAS_NODES.map((n) =>
              n.type === 'chat'
                ? { ...n, data: { ...n.data, onBranchCreate: stableBranchCreate } }
                : n,
            ),
          );
          setEdges(DEFAULT_CANVAS_EDGES);
        }
        if (saved?.viewMode === 'linear' || saved?.viewMode === 'canvas') {
          setViewMode(saved.viewMode);
        }
        saveAllowedRef.current = true;
      } catch {
        router.replace('/canvas');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, router, setNodes, setEdges, stableBranchCreate]);

  /* ── Auto-save on changes (debounced) ── */
  useEffect(() => {
    if (!saveAllowedRef.current || !projectId || !UUID_RE.test(projectId)) return;
    const timer = setTimeout(() => {
      const state: CanvasWorkspaceState = {
        viewMode,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type ?? 'chat',
          position: n.position,
          style: n.style as Record<string, unknown> | undefined,
          data: {
            title: (n.data as Record<string, unknown>)?.title,
            skill: (n.data as Record<string, unknown>)?.skill,
            pages: (n.data as Record<string, unknown>)?.pages,
            src: (n.data as Record<string, unknown>)?.src,
            alt: (n.data as Record<string, unknown>)?.alt,
            content: (n.data as Record<string, unknown>)?.content,
            language: (n.data as Record<string, unknown>)?.language,
            autoBranch: (n.data as Record<string, unknown>)?.autoBranch,
            messages: (n.data as Record<string, unknown>)?.messages,
            initialMessages: (n.data as Record<string, unknown>)?.initialMessages,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          animated: e.animated,
          style: e.style as Record<string, unknown> | undefined,
        })),
      };
      void updateCanvasWorkspace(projectId, { title: workspaceName, state });
    }, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges, workspaceName, viewMode, projectId]);

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
    <div className="h-full w-full bg-background relative">
      {/* Back button */}
      <button
        onClick={() => router.push(`/canvas${roleSuffix}`)}
        className="absolute top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-md border border-border hover:bg-muted transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-primary" />
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

          {/* Settings panel */}
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

          {/* React Flow canvas */}
          <ReactFlowWithExtras
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
              style: { stroke: themeColor.input, strokeWidth: 2 },
            }}
            _bgColor={themeColor.border}
            _bgStyle={themeColor.background}
            _miniMapNodeColor={themeColor.primary}
          />
        </>
      )}
    </div>
  );
}
