'use client';

import { useState, useEffect } from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import Link from 'next/link';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import type { ConceptReadiness, ConceptGraphNode, ConceptGraphEdge } from '@/lib/types';

const getReadinessColor = (readiness: number) => {
  if (readiness >= 0.8) return '#16A34A';
  if (readiness >= 0.6) return '#22C55E';
  if (readiness >= 0.4) return '#F59E0B';
  if (readiness >= 0.2) return '#F97316';
  return '#DC2626';
};

export default function StudentReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<ConceptReadiness[]>([]);
  const [graphNodes, setGraphNodes] = useState<ConceptGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<ConceptGraphEdge[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cr, graph] = await Promise.all([
        api.getClassReadiness('e1'),
        api.getConceptGraph('e1'),
      ]);
      setConcepts(cr);
      setGraphNodes(graph.nodes);
      setGraphEdges(graph.edges);
    } catch {
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading your readiness report..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadData} /></StudentLayout>;

  const positions = [
    { x: 200, y: 20 }, { x: 400, y: 20 }, { x: 100, y: 130 },
    { x: 300, y: 130 }, { x: 200, y: 240 }, { x: 0, y: 130 },
    { x: 300, y: 240 }, { x: 400, y: 240 },
  ];

  const flowNodes = graphNodes.map((n, i) => ({
    id: n.id,
    position: positions[i] || { x: i * 140, y: 100 },
    data: { label: `${n.label} (${((n.readiness || 0) * 100).toFixed(0)}%)` },
    type: 'default' as const,
    style: {
      background: getReadinessColor(n.readiness || 0),
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 500,
      boxShadow: `0 2px 8px ${getReadinessColor(n.readiness || 0)}30`,
    },
  }));

  const flowEdges = graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep' as const,
    style: { stroke: '#CBD5E1', strokeWidth: 2 },
  }));

  const weakConcepts = concepts.filter((c) => c.readiness < 0.6).sort((a, b) => a.readiness - b.readiness);

  return (
    <StudentLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-[#00274C] mb-1">Your Readiness Report</h1>
            <p className="text-sm text-[#94A3B8]">EECS 280 &bull; Midterm 1 &bull; Detailed concept-level analysis</p>
          </div>

          {/* Concept Map */}
          <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-100">
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Concept Map</h2>
            <div className="h-80 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#CBD5E1', strokeWidth: 2 } }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background gap={20} size={1} color="#E2E8F0" />
              </ReactFlow>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              {[
                { color: '#DC2626', label: '0–20%' },
                { color: '#F97316', label: '20–40%' },
                { color: '#F59E0B', label: '40–60%' },
                { color: '#22C55E', label: '60–80%' },
                { color: '#16A34A', label: '80–100%' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[#4A5568]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Readiness Breakdown */}
            <div className="card-elevated p-6 animate-fade-in-up delay-200">
              <h2 className="text-lg font-semibold text-[#00274C] mb-4">Readiness Breakdown</h2>
              <div className="space-y-3">
                {[...concepts].sort((a, b) => a.readiness - b.readiness).map((concept) => (
                  <div key={concept.concept} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                    <span className="text-sm font-medium text-[#1A1A2E]">{concept.concept}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${concept.readiness * 100}%`, backgroundColor: getReadinessColor(concept.readiness) }} />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A2E] w-10 text-right">{(concept.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Focus */}
            <div className="card-elevated p-6 animate-fade-in-up delay-300">
              <h2 className="text-lg font-semibold text-[#00274C] mb-4">Areas for Focus</h2>
              <div className="space-y-3">
                {weakConcepts.map((concept) => (
                  <div key={concept.concept} className="border border-[#E2E8F0] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-[#1A1A2E] text-sm">{concept.concept}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: getReadinessColor(concept.readiness) }}>
                          {(concept.readiness * 100).toFixed(0)}%
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          concept.confidence === 'high' ? 'bg-[#16A34A]/10 text-[#16A34A]' : concept.confidence === 'medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#94A3B8]/10 text-[#94A3B8]'
                        }`}>
                          {concept.confidence}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {concept.questionCount} questions &bull; Direct: {(concept.directReadiness * 100).toFixed(0)}% &bull; Penalty: {(concept.prerequisitePenalty * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 card-elevated p-6 animate-fade-in-up delay-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#00274C] mb-1">Ready to improve?</h3>
                <p className="text-sm text-[#4A5568]">View your personalized study plan ordered by prerequisite dependencies.</p>
              </div>
              <Link href="/student/study-plan" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg py-2.5 px-6 font-medium transition-colors text-sm flex-shrink-0">
                View Study Plan
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center animate-fade-in-up delay-500">
            <p className="text-xs text-[#94A3B8]">This report is private to you. No peer comparisons or rankings are shown.</p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
