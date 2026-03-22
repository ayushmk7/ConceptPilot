'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Skeleton } from '@/components/LoadingSkeleton';
import { readinessColorFromScore, readinessColorsJs } from '@/lib/theme-colors';
import * as api from '@/lib/api';
import type { ConceptReadiness } from '@/lib/types';
import type { StudentReportResponse } from '@/lib/api-types';
import { StudentConceptGraphDynamic } from '@/components/graph/d3-graphs-dynamic';
import { graphNodesEdgesToStudentConcepts } from '@/lib/graph-student-concepts';

const heatLegend = readinessColorsJs.map((color, i) => ({
  color,
  label: ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'][i],
}));

export default function StudentReport() {
  const [report, setReport] = useState<StudentReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.fetchOpenStudentReport();
        if (!cancelled) setReport(r);
      } catch (e) {
        if (!cancelled) {
          setErr(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const concepts: ConceptReadiness[] = report ? api.studentReportToConcepts(report) : [];
  const { nodes: graphNodes, edges: graphEdges } = report ? api.studentReportToGraph(report) : { nodes: [], edges: [] };

  const studentReadinessRecord = useMemo(() => {
    const m: Record<string, number> = {};
    if (report?.readiness) {
      for (const x of report.readiness) {
        m[x.concept_id] = x.final_readiness;
      }
    }
    return m;
  }, [report]);

  const studentGraphConcepts = useMemo(() => {
    if (graphNodes.length === 0) return [];
    return graphNodesEdgesToStudentConcepts(graphNodes, graphEdges, studentReadinessRecord);
  }, [graphNodes, graphEdges, studentReadinessRecord]);

  const weakConcepts = concepts.filter((c) => c.readiness < 0.6).sort((a, b) => a.readiness - b.readiness);

  return (
    <StudentLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Your Readiness Report</h1>
            <p className="text-sm text-muted-foreground">Concept-level analysis from your uploaded data in this browser workspace.</p>
          </div>

          {loading && <Skeleton className="h-96 w-full rounded-xl" />}
          {err && <p className="text-sm text-destructive">{err}</p>}

          {!loading && !err && !report && (
            <div className="card-elevated p-6 rounded-xl text-sm text-muted-foreground">
              <p>No report payload loaded. If you just finished an upload, wait a moment and refresh, or open this page from the sidebar (My Report).</p>
              <Link href="/student/upload" className="mt-3 inline-block text-primary font-medium hover:underline">
                Back to Upload
              </Link>
            </div>
          )}

          {!loading && !err && report && (
            <>
              <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-100">
                <h2 className="text-lg text-foreground mb-4">Your Concept Map</h2>
                <div className="flex min-h-[280px] h-[min(50vh,400px)] flex-col overflow-hidden rounded-xl border border-border bg-muted/50">
                  {studentGraphConcepts.length > 0 ? (
                    <StudentConceptGraphDynamic concepts={studentGraphConcepts} studentReadiness={studentReadinessRecord} />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                      No graph yet. Upload scores and mapping, then run compute — or upload study material to generate a draft graph.
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Interactive view showing mastery across all course concepts
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {heatLegend.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-secondary-text">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-elevated p-6 animate-fade-in-up delay-200">
                  <h2 className="text-lg font-semibold text-primary mb-4">Readiness Breakdown</h2>
                  <div className="space-y-3">
                    {concepts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No readiness rows yet. Upload test CSVs and run compute.</p>
                    ) : (
                      [...concepts].sort((a, b) => a.readiness - b.readiness).map((concept) => (
                        <div key={concept.concept} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                          <span className="text-sm font-medium text-foreground">{concept.concept}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${concept.readiness * 100}%`, backgroundColor: readinessColorFromScore(concept.readiness) }}
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground w-10 text-right">{(concept.readiness * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card-elevated p-6 animate-fade-in-up delay-300">
                  <h2 className="text-lg font-semibold text-primary mb-4">Areas for Focus</h2>
                  <div className="space-y-3">
                    {weakConcepts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No weak concepts identified yet.</p>
                    ) : (
                      weakConcepts.map((concept) => (
                        <div key={concept.concept} className="border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between mb-1">
                            <div className="font-medium text-foreground text-sm">{concept.concept}</div>
                            <span className="text-sm font-medium" style={{ color: readinessColorFromScore(concept.readiness) }}>
                              {(concept.readiness * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 card-elevated p-6 animate-fade-in-up delay-400">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-primary mb-1">Study plan</h3>
                    <p className="text-sm text-secondary-text">Ordered by prerequisite dependencies when readiness data exists.</p>
                  </div>
                  <Link
                    href="/student/study-plan"
                    className="bg-chart-5 hover:bg-blue-600 text-white rounded-lg py-2.5 px-6 font-medium transition-colors text-sm flex-shrink-0"
                  >
                    View Study Plan
                  </Link>
                </div>
              </div>

              <div className="mt-6 text-center animate-fade-in-up delay-500">
                <p className="text-xs text-muted-foreground">Data is stored for this workspace only on this device until you clear site data.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
