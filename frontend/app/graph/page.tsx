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

const getReadinessColor = (readiness?: number) => {
  if (!readiness) return '#94A3B8';
  if (readiness >= 0.8) return '#16A34A';
  if (readiness >= 0.6) return '#22C55E';
  if (readiness >= 0.4) return '#F59E0B';
  if (readiness >= 0.2) return '#F97316';
  return '#DC2626';
};

export default function GraphEditorPage() {
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
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const { nodes, edges } = await api.getConceptGraph('e1');
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
      color: '#fff',
      border: selectedNodeId === n.id ? '3px solid #FFCB05' : 'none',
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
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
    style: { stroke: '#94A3B8', strokeWidth: 2 },
    animated: false,
  }));

  const handleAddNode = async () => {
    if (!newNodeLabel.trim()) return;
    try {
      const node = await api.addGraphNode('e1', newNodeLabel.trim());
      setGraphNodes((prev) => [...prev, node]);
      setNewNodeLabel('');
      setShowAddNode(false);
      setHasChanges(true);
    } catch {
      // handled silently
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNodeId) return;
    await api.removeGraphNode('e1', selectedNodeId);
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
          const edge: ConceptGraphEdge = { id: `ge_${Date.now()}`, source: connectingFrom, target: node.id };
          setGraphEdges((prev) => [...prev, edge]);
          setHasChanges(true);
        }
      }
      setConnectingFrom(null);
    } else {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [connectingFrom, selectedNodeId, graphEdges]);

  const handleDeleteEdge = async (edgeId: string) => {
    await api.removeGraphEdge('e1', edgeId);
    setGraphEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // Mock save
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setHasChanges(false);
  };

  if (loading) return <InstructorLayout><PageLoader message="Loading concept graph..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadGraph} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative h-[calc(100vh-56px)] flex flex-col">
        <DotPattern className="text-[#94A3B8]" />

        {/* Toolbar */}
        <div className="relative px-6 py-4 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-[#00274C]">Concept Graph Editor</h1>
            <p className="text-xs text-[#94A3B8]">Define and edit prerequisite relationships between concepts</p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-[#F59E0B] mr-2">Unsaved changes</span>
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
              className="inline-flex items-center gap-1.5 text-sm py-2 px-3 border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-[#DC2626]/10 disabled:opacity-40"
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
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-lg animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            <span className="text-sm text-[#DC2626]">{dagError}</span>
          </div>
        )}

        {/* Add node dialog */}
        {showAddNode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-4 w-72 animate-fade-in">
            <h3 className="text-sm font-semibold text-[#00274C] mb-2">New Concept</h3>
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Concept name..."
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 mb-3"
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
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-[#FFCB05] text-[#00274C] rounded-lg px-4 py-2 text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
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
              markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
              style: { stroke: '#94A3B8', strokeWidth: 2 },
            }}
          >
            <Background gap={20} size={1} color="#E2E8F0" />
            <Controls />
            <Panel position="bottom-left">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-[#E2E8F0] p-3 text-xs text-[#4A5568] space-y-1">
                <div className="font-medium text-[#00274C] mb-1">Legend</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#DC2626]" /> 0–20%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#F97316]" /> 20–40%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#F59E0B]" /> 40–60%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#22C55E]" /> 60–80%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#16A34A]" /> 80–100%</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#94A3B8]" /> No data</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Edge list sidebar */}
        <div className="absolute right-0 top-[72px] bottom-0 w-56 bg-white/95 backdrop-blur-sm border-l border-[#E2E8F0] overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-[#94A3B8] tracking-wider uppercase mb-2">Edges ({graphEdges.length})</h3>
          <div className="space-y-1">
            {graphEdges.map((edge) => {
              const src = graphNodes.find((n) => n.id === edge.source);
              const tgt = graphNodes.find((n) => n.id === edge.target);
              return (
                <div key={edge.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-[#F8FAFC] group">
                  <span className="text-[#4A5568] truncate">{src?.label} → {tgt?.label}</span>
                  <button
                    onClick={() => handleDeleteEdge(edge.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#FEF2F2] rounded"
                  >
                    <Trash2 className="w-3 h-3 text-[#DC2626]" />
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
