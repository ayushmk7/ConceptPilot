'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge, MarkerType, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { InstructorLayout } from '@/components/InstructorLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Plus, Trash2, Loader2, Sparkles, AlertTriangle, Save, Undo2 } from 'lucide-react';
import * as api from '@/lib/api';
import { ErrorState } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/LoadingSkeleton';
import type { ConceptGraphNode, ConceptGraphEdge } from '@/lib/types';
import { useExam } from '@/lib/exam-context';
import { readinessColorFromScore, themeColor } from '@/lib/theme-colors';

const getReadinessColor = (readiness?: number) => {
  if (readiness == null) return themeColor.mutedForeground;
  return readinessColorFromScore(readiness);
};

export default function GraphEditorPage() {
  const { selectedExamId, loading: examLoading } = useExam();
  const [graphNodes, setGraphNodes] = useState<ConceptGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<ConceptGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [showAddNode, setShowAddNode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dagError, setDagError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExamId) return;
    loadGraph();
  }, [selectedExamId]);

  const loadGraph = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const { nodes, edges } = await api.getConceptGraph(selectedExamId);
      setGraphNodes(nodes);
      setGraphEdges(edges);
    } catch {
      setError('Failed to load concept graph');
    } finally {
      setLoading(false);
    }
  };

  // Convert to ReactFlow nodes
  const flowNodes: Node[] = graphNodes.map((n, i) => ({
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

  const flowEdges: Edge[] = graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: themeColor.mutedForeground },
    style: { stroke: themeColor.mutedForeground, strokeWidth: 2 },
    animated: false,
  }));

  const handleAddNode = async () => {
    if (!newNodeLabel.trim() || !selectedExamId) return;
    try {
      const node = await api.addGraphNode(selectedExamId, newNodeLabel.trim());
      setGraphNodes((prev) => [...prev, node]);
      setNewNodeLabel('');
      setShowAddNode(false);
      setHasChanges(true);
    } catch {
      // handled silently
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNodeId || !selectedExamId) return;
    await api.removeGraphNode(selectedExamId, selectedNodeId);
    setGraphNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setGraphEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setHasChanges(true);
  };

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (connectingFrom) {
      if (connectingFrom !== node.id) {
        // Check for DAG cycle (simple check)
        const wouldCycle = graphEdges.some((e) => e.source === node.id && e.target === connectingFrom);
        if (wouldCycle) {
          setDagError(`Adding edge ${connectingFrom} → ${node.id} would create a cycle`);
          setTimeout(() => setDagError(null), 3000);
        } else {
          if (!selectedExamId) return;
          void api.addGraphEdge(selectedExamId, connectingFrom, node.id).then((e) => {
            setGraphEdges((prev) => [...prev, e]);
            setHasChanges(true);
          });
        }
      }
      setConnectingFrom(null);
    } else {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [connectingFrom, selectedNodeId, graphEdges, selectedExamId]);

  const handleDeleteEdge = async (edgeId: string) => {
    const edge = graphEdges.find((e) => e.id === edgeId);
    if (!edge || !selectedExamId) return;
    try {
      await api.removeGraphEdge(selectedExamId, edgeId, edge.source, edge.target);
      setGraphEdges((prev) => prev.filter((e) => e.id !== edgeId));
      setHasChanges(true);
    } catch {
      // handled
    }
  };

  const handleSave = async () => {
    if (!selectedExamId) return;
    setSaving(true);
    try {
      await loadGraph();
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  if (examLoading || !selectedExamId) {
    return (
      <InstructorLayout>
        <PageLoader message={!selectedExamId ? 'Select a course and exam from the dashboard or upload wizard.' : 'Loading…'} />
      </InstructorLayout>
    );
  }

  if (loading) return <InstructorLayout><PageLoader message="Loading concept graph..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadGraph} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative h-[calc(100vh-56px)] flex flex-col">
        <DotPattern className="text-muted-foreground" />

        {/* Toolbar */}
        <div className="relative px-6 py-4 border-b border-border bg-white/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-primary">Concept Graph Editor</h1>
            <p className="text-xs text-muted-foreground">Define and edit prerequisite relationships between concepts</p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-chart-3 mr-2">Unsaved changes</span>
            )}
            <button
              onClick={() => setShowAddNode(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-sm py-2 px-3"
            >
              <Plus className="w-4 h-4" /> Add Concept
            </button>
            <button
              onClick={() => setConnectingFrom(selectedNodeId)}
              disabled={!selectedNodeId}
              className="btn-outline inline-flex items-center gap-1.5 text-sm py-2 px-3 disabled:opacity-40"
            >
              Add Edge From Selected
            </button>
            <button
              onClick={handleDeleteNode}
              disabled={!selectedNodeId}
              className="inline-flex items-center gap-1.5 text-sm py-2 px-3 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="btn-primary inline-flex items-center gap-1.5 text-sm py-2 px-3"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {/* DAG validation error */}
        {dagError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-lg animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{dagError}</span>
          </div>
        )}

        {/* Add node dialog */}
        {showAddNode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-white border border-border rounded-xl shadow-xl p-4 w-72 animate-fade-in">
            <h3 className="text-sm font-semibold text-primary mb-2">New Concept</h3>
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Concept name..."
              className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAddNode(false)} className="flex-1 btn-outline text-sm py-1.5">Cancel</button>
              <button onClick={handleAddNode} disabled={!newNodeLabel.trim()} className="flex-1 btn-primary text-sm py-1.5">Add</button>
            </div>
          </div>
        )}

        {/* Connecting mode indicator */}
        {connectingFrom && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-accent text-primary rounded-lg px-4 py-2 text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
            Click a target concept to create an edge
            <button onClick={() => setConnectingFrom(null)} className="ml-2 text-xs underline">Cancel</button>
          </div>
        )}

        {/* Graph canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={handleNodeClick}
            onEdgeClick={(_, edge) => {
              if (confirm(`Delete edge ${edge.id}?`)) handleDeleteEdge(edge.id);
            }}
            fitView
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: themeColor.mutedForeground },
              style: { stroke: themeColor.mutedForeground, strokeWidth: 2 },
            }}
          >
            <Background gap={20} size={1} color={themeColor.border} />
            <Controls />
            <Panel position="bottom-left">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs text-secondary-text space-y-1">
                <div className="font-medium text-primary mb-1">Legend</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-destructive" /> 0–20%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-readiness-1" /> 20–40%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-chart-3" /> 40–60%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-readiness-3" /> 60–80%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-chart-4" /> 80–100%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-muted-foreground" /> No data</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Edge list sidebar */}
        <div className="absolute right-0 top-[72px] bottom-0 w-56 bg-white/95 backdrop-blur-sm border-l border-border overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Edges ({graphEdges.length})</h3>
          <div className="space-y-1">
            {graphEdges.map((edge) => {
              const src = graphNodes.find((n) => n.id === edge.source);
              const tgt = graphNodes.find((n) => n.id === edge.target);
              return (
                <div key={edge.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 group">
                  <span className="text-secondary-text truncate">{src?.label} → {tgt?.label}</span>
                  <button
                    onClick={() => handleDeleteEdge(edge.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
