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
import { readinessColorFromScore, readinessColorsJs, themeColor } from '@/lib/theme-colors';

const heatLegend = readinessColorsJs.map((color, i) => ({
  color,
  label: ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'][i],
}));

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
      let r = api.getStudentReportFromCache();
      if (!r) {
        await api.getStudentReadiness('', '');
        r = api.getStudentReportFromCache();
      }
      if (!r) throw new Error('no report');
      setConcepts(api.studentReportToConcepts(r));
      const g = api.studentReportToGraph(r);
      setGraphNodes(g.nodes);
      setGraphEdges(g.edges);
    } catch {
      setError('Failed to load report data. Use your instructor access link.');
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
      background: readinessColorFromScore(n.readiness || 0),
      color: themeColor.white,
      border: 'none',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 500,
      boxShadow: `0 2px 8px ${readinessColorFromScore(n.readiness || 0)}30`,
    },
  }));

  const flowEdges = graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep' as const,
    style: { stroke: themeColor.input, strokeWidth: 2 },
  }));

  const weakConcepts = concepts.filter((c) => c.readiness < 0.6).sort((a, b) => a.readiness - b.readiness);

  return (
    <StudentLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Your Readiness Report</h1>
            <p className="text-sm text-muted-foreground">EECS 280 &bull; Midterm 1 &bull; Detailed concept-level analysis</p>
          </div>

          {/* Concept Map */}
          <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-100">
            <h2 className="text-lg font-semibold text-primary mb-4">Concept Map</h2>
            <div className="h-80 bg-muted/50 rounded-xl border border-border">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: themeColor.input, strokeWidth: 2 } }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background gap={20} size={1} color={themeColor.border} />
              </ReactFlow>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              {heatLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-secondary-text">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Readiness Breakdown */}
            <div className="card-elevated p-6 animate-fade-in-up delay-200">
              <h2 className="text-lg font-semibold text-primary mb-4">Readiness Breakdown</h2>
              <div className="space-y-3">
                {[...concepts].sort((a, b) => a.readiness - b.readiness).map((concept) => (
                  <div key={concept.concept} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                    <span className="text-sm font-medium text-foreground">{concept.concept}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${concept.readiness * 100}%`, backgroundColor: readinessColorFromScore(concept.readiness) }} />
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{(concept.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Focus */}
            <div className="card-elevated p-6 animate-fade-in-up delay-300">
              <h2 className="text-lg font-semibold text-primary mb-4">Areas for Focus</h2>
              <div className="space-y-3">
                {weakConcepts.map((concept) => (
                  <div key={concept.concept} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-foreground text-sm">{concept.concept}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: readinessColorFromScore(concept.readiness) }}>
                          {(concept.readiness * 100).toFixed(0)}%
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          concept.confidence === 'high' ? 'bg-chart-4/10 text-chart-4' : concept.confidence === 'medium' ? 'bg-chart-3/10 text-chart-3' : 'bg-muted-foreground/10 text-muted-foreground'
                        }`}>
                          {concept.confidence}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                <h3 className="text-base font-semibold text-primary mb-1">Ready to improve?</h3>
                <p className="text-sm text-secondary-text">View your personalized study plan ordered by prerequisite dependencies.</p>
              </div>
              <Link href="/student/study-plan" className="bg-chart-5 hover:bg-blue-600 text-white rounded-lg py-2.5 px-6 font-medium transition-colors text-sm flex-shrink-0">
                View Study Plan
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center animate-fade-in-up delay-500">
            <p className="text-xs text-muted-foreground">This report is private to you. No peer comparisons or rankings are shown.</p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
