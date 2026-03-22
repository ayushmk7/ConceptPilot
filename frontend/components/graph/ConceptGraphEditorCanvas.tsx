'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ConceptGraphEdge, ConceptGraphNode } from '@/lib/types';
import { readinessColorFromScore, themeColor } from '@/lib/theme-colors';

const getReadinessColor = (readiness?: number) => {
  if (readiness == null) return themeColor.mutedForeground;
  return readinessColorFromScore(readiness);
};

function flowNodesFromGraph(
  graphNodes: ConceptGraphNode[],
  selectedNodeId: string | null,
  connectingFrom: string | null,
): Node[] {
  return graphNodes.map((n, i) => ({
    id: n.id,
    position: { x: 120 + (i % 4) * 200, y: 60 + Math.floor(i / 4) * 150 },
    data: { label: n.label },
    type: 'default',
    style: {
      background: getReadinessColor(n.readiness),
      color: themeColor.white,
      border: selectedNodeId === n.id ? `3px solid ${themeColor.accent}` : 'none',
      borderRadius: '10px',
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: 600,
      boxShadow: `0 2px 8px ${getReadinessColor(n.readiness)}30`,
      cursor: connectingFrom ? 'crosshair' : 'pointer',
    },
  }));
}

function flowEdgesFromGraph(graphEdges: ConceptGraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: themeColor.mutedForeground },
    style: { stroke: themeColor.mutedForeground, strokeWidth: 2 },
    animated: false,
    reconnectable: true,
  }));
}

export type ConceptGraphEditorCanvasProps = {
  graphNodes: ConceptGraphNode[];
  graphEdges: ConceptGraphEdge[];
  selectedNodeId: string | null;
  connectingFrom: string | null;
  onNodeClick: (e: React.MouseEvent, node: Node) => void;
  onEdgeClick: (e: React.MouseEvent, edge: Edge) => void;
  /** Return false to block reconnect (e.g. DAG violation). */
  validateReconnect: (oldEdge: Edge, newConnection: Connection) => boolean;
  /** Persist after local edge state is updated; should update parent graphEdges on success. */
  onReconnectPersist: (oldEdge: Edge, newConnection: Connection) => Promise<void>;
  onReconnectFailed?: () => void;
  children?: React.ReactNode;
};

function ConceptGraphEditorCanvasInner({
  graphNodes,
  graphEdges,
  selectedNodeId,
  connectingFrom,
  onNodeClick,
  onEdgeClick,
  validateReconnect,
  onReconnectPersist,
  onReconnectFailed,
  children,
}: ConceptGraphEditorCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodesSig = useMemo(
    () => graphNodes.map((n) => `${n.id}:${n.readiness ?? ''}:${n.label}`).join('|'),
    [graphNodes],
  );
  const edgesKey = useMemo(
    () => graphEdges.map((e) => `${e.source}->${e.target}`).join('|'),
    [graphEdges],
  );

  useEffect(() => {
    setNodes(flowNodesFromGraph(graphNodes, selectedNodeId, connectingFrom));
  }, [nodesSig, graphNodes, selectedNodeId, connectingFrom, setNodes]);

  useEffect(() => {
    setEdges(flowEdgesFromGraph(graphEdges));
  }, [edgesKey, graphEdges, setEdges]);

  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      if (oldEdge.source === newConnection.source && oldEdge.target === newConnection.target) {
        return;
      }
      if (!validateReconnect(oldEdge, newConnection)) {
        return;
      }
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      try {
        await onReconnectPersist(oldEdge, newConnection);
      } catch {
        onReconnectFailed?.();
      }
    },
    [setEdges, validateReconnect, onReconnectPersist, onReconnectFailed],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onReconnect={onReconnect}
      edgesReconnectable
      fitView
      defaultEdgeOptions={{
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: themeColor.mutedForeground },
        style: { stroke: themeColor.mutedForeground, strokeWidth: 2 },
        reconnectable: true,
      }}
    >
      <Background gap={20} size={1} color={themeColor.border} />
      <Controls />
      <MiniMap
        className="bg-white/80 rounded-lg border border-border"
        nodeColor={() => themeColor.primary}
        maskColor="rgba(248, 250, 252, 0.7)"
        pannable
        zoomable
        position="bottom-right"
      />
      {children ? (
        <Panel position="bottom-left">
          {children}
        </Panel>
      ) : null}
    </ReactFlow>
  );
}

export function ConceptGraphEditorCanvas(props: ConceptGraphEditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <ConceptGraphEditorCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
