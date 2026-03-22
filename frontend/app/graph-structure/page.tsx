'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge, Connection } from '@xyflow/react';
import Link from 'next/link';
import { InstructorLayout } from '@/components/InstructorLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Plus, Trash2, Loader2, AlertTriangle, Save, GitBranch } from 'lucide-react';
import * as api from '@/lib/api';
import { ErrorState } from '@/components/ErrorBoundary';
import type { ConceptGraphNode, ConceptGraphEdge } from '@/lib/types';
import { useExam } from '@/lib/exam-context';
import { ConceptGraphEditorCanvas } from '@/components/graph/ConceptGraphEditorCanvas';
import { wouldReconnectCreateCycle } from '@/lib/graph-dag';

/** React Flow–based node/edge editor (separate from `/graph` D3 knowledge graph view). */
export default function GraphStructureEditorPage() {
  const { selectedExamId, loading: examLoading } = useExam();
  const [graphNodes, setGraphNodes] = useState<ConceptGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<ConceptGraphEdge[]>([]);
  const graphEdgesRef = useRef(graphEdges);
  graphEdgesRef.current = graphEdges;

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
    void loadGraph();
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

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (connectingFrom) {
        if (connectingFrom !== node.id) {
          const wouldCycle = graphEdgesRef.current.some(
            (e) => e.source === node.id && e.target === connectingFrom,
          );
          if (wouldCycle) {
            setDagError(`Adding edge ${connectingFrom} → ${node.id} would create a cycle`);
            setTimeout(() => setDagError(null), 3000);
          } else if (selectedExamId) {
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
    },
    [connectingFrom, selectedNodeId, selectedExamId],
  );

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

  const validateReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    const { source: ns, target: nt } = newConnection;
    if (
      wouldReconnectCreateCycle(graphEdgesRef.current, oldEdge.source, oldEdge.target, ns, nt)
    ) {
      setDagError(`Reconnect would create a cycle`);
      setTimeout(() => setDagError(null), 4000);
      return false;
    }
    return true;
  }, []);

  const onReconnectPersist = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      if (!selectedExamId) return;
      const ns = newConnection.source;
      const nt = newConnection.target;
      await api.reconnectGraphEdge(selectedExamId, oldEdge.source, oldEdge.target, ns, nt);
      setGraphEdges((prev) => {
        const filtered = prev.filter(
          (e) => !(e.source === oldEdge.source && e.target === oldEdge.target),
        );
        const id = `e-${ns}-${nt}-${filtered.length}`;
        return [...filtered, { id, source: ns, target: nt }];
      });
      setHasChanges(true);
    },
    [selectedExamId],
  );

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

  if (error) {
    return (
      <InstructorLayout>
        <ErrorState message={error} onRetry={loadGraph} />
      </InstructorLayout>
    );
  }

  const isReady = !examLoading && selectedExamId && !loading;

  return (
    <InstructorLayout>
      <div className="relative h-[calc(100vh-56px)] flex flex-col">
        <DotPattern className="text-muted-foreground" />

        <div className="relative px-6 py-4 border-b border-border bg-white/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-primary">Structure editor</h1>
            <p className="text-xs text-muted-foreground">
              Add/remove nodes and edges (React Flow). The Knowledge Graph page uses a separate D3 view for exploration and AI expand.
            </p>
            <Link
              href="/graph"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Back to Knowledge Graph
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && <span className="text-xs text-chart-3 mr-2">Unsaved changes</span>}
            <button
              type="button"
              onClick={() => setShowAddNode(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-sm py-2 px-3"
            >
              <Plus className="w-4 h-4" /> Add Concept
            </button>
            <button
              type="button"
              onClick={() => setConnectingFrom(selectedNodeId)}
              disabled={!selectedNodeId}
              className="btn-outline inline-flex items-center gap-1.5 text-sm py-2 px-3 disabled:opacity-40"
            >
              Add Edge From Selected
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteNode()}
              disabled={!selectedNodeId}
              className="inline-flex items-center gap-1.5 text-sm py-2 px-3 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!hasChanges || saving}
              className="btn-primary inline-flex items-center gap-1.5 text-sm py-2 px-3"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {dagError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-lg animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{dagError}</span>
          </div>
        )}

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
              onKeyDown={(e) => e.key === 'Enter' && void handleAddNode()}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddNode(false)} className="flex-1 btn-outline text-sm py-1.5">
                Cancel
              </button>
              <button type="button" onClick={() => void handleAddNode()} disabled={!newNodeLabel.trim()} className="flex-1 btn-primary text-sm py-1.5">
                Add
              </button>
            </div>
          </div>
        )}

        {connectingFrom && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-accent text-primary rounded-lg px-4 py-2 text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
            Click a target concept to create an edge
            <button type="button" onClick={() => setConnectingFrom(null)} className="ml-2 text-xs underline">
              Cancel
            </button>
          </div>
        )}

        <div className="flex-1">
          {!isReady ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {!selectedExamId ? 'Select a course and exam from the sidebar.' : 'Loading concept graph...'}
                </p>
              </div>
            </div>
          ) : (
            <ConceptGraphEditorCanvas
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              selectedNodeId={selectedNodeId}
              connectingFrom={connectingFrom}
              onNodeClick={handleNodeClick}
              onEdgeClick={(_, edge) => {
                if (confirm(`Delete edge ${edge.id}?`)) void handleDeleteEdge(edge.id);
              }}
              validateReconnect={validateReconnect}
              onReconnectPersist={onReconnectPersist}
              onReconnectFailed={loadGraph}
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs text-secondary-text space-y-1 max-w-[220px]">
                <div className="font-medium text-primary mb-1">Legend</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-destructive" /> 0–20%
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-readiness-1" /> 20–40%
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-chart-3" /> 40–60%
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-readiness-3" /> 60–80%
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-chart-4" /> 80–100%
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-muted-foreground" /> No data
                </div>
              </div>
            </ConceptGraphEditorCanvas>
          )}
        </div>

        <div className="absolute right-0 top-[72px] bottom-0 w-56 bg-white/95 backdrop-blur-sm border-l border-border overflow-y-auto p-3 z-[5]">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
            Edges ({graphEdges.length})
          </h3>
          <div className="space-y-1">
            {graphEdges.map((edge) => {
              const src = graphNodes.find((n) => n.id === edge.source);
              const tgt = graphNodes.find((n) => n.id === edge.target);
              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-muted/50 group"
                >
                  <span className="text-secondary-text truncate">
                    {src?.label} → {tgt?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteEdge(edge.id)}
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
