'use client';

import { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { AlertTriangle, Users, BookOpen, Bell, Lightbulb, Settings2, X, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DotPattern } from '@/components/svg/DotPattern';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import type { Alert, Intervention, Cluster, ReadinessParams } from '@/lib/types';
import { useExam } from '@/lib/exam-context';
import { readinessColorsJs, themeColor } from '@/lib/theme-colors';

const readinessColors = [...readinessColorsJs];
const readinessLabels = ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'];

export default function Dashboard() {
  const {
    courses,
    exams,
    selectedCourseId,
    selectedExamId,
    setSelectedCourseId,
    setSelectedExamId,
    loading: examCtxLoading,
    error: examCtxError,
  } = useExam();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<{ name: string; conceptId: string; readiness: number[] }[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [params, setParams] = useState<ReadinessParams>({ alpha: 0.5, beta: 0.3, gamma: 0.2, threshold: 0.6, k: 3 });
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [editParams, setEditParams] = useState<ReadinessParams>(params);
  const [savingParams, setSavingParams] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    if (examCtxLoading || !selectedExamId) {
      if (!examCtxLoading && !selectedExamId) setLoading(false);
      return;
    }
    loadData();
  }, [examCtxLoading, selectedExamId]);

  const loadData = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const [hm, al, iv, cl, p, students] = await Promise.all([
        api.getHeatmapData(selectedExamId),
        api.getAlerts(selectedExamId),
        api.getInterventions(selectedExamId),
        api.getClusters(selectedExamId),
        api.getReadinessParams(selectedExamId),
        api.getStudentsList(selectedExamId),
      ]);
      setHeatmapData(hm);
      setAlerts(al);
      setInterventions(iv);
      setClusters(cl);
      setParams(p);
      setEditParams(p);
      setTotalStudents(students.length);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParams = async () => {
    if (!selectedExamId) return;
    setSavingParams(true);
    try {
      const updated = await api.updateReadinessParams(selectedExamId, editParams);
      setParams(updated);
      setShowParamEditor(false);
    } catch {
      // handled
    } finally {
      setSavingParams(false);
    }
  };

  if (examCtxLoading) return <InstructorLayout><DashboardSkeleton /></InstructorLayout>;
  if (examCtxError) return <InstructorLayout><ErrorState message={examCtxError} onRetry={() => window.location.reload()} /></InstructorLayout>;
  if (!selectedExamId) {
    return (
      <InstructorLayout>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center text-secondary-text">
          <p className="mb-4">Create a course and exam from the upload wizard, or select an exam below once courses load.</p>
        </div>
      </InstructorLayout>
    );
  }
  if (loading) return <InstructorLayout><DashboardSkeleton /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadData} /></InstructorLayout>;

  const stats = [
    { label: 'Total Students', value: String(totalStudents), icon: Users, color: themeColor.chart5, bg: 'rgb(239 246 255)' },
    { label: 'Concepts', value: String(heatmapData.length), icon: BookOpen, color: themeColor.chart4, bg: 'rgb(240 253 244)' },
    { label: 'Active Alerts', value: String(alerts.length), icon: Bell, color: themeColor.destructive, bg: 'rgb(254 242 242)' },
    { label: 'Interventions', value: String(interventions.length), icon: Lightbulb, color: themeColor.chart3, bg: 'rgb(255 251 235)' },
  ];

  return (
    <InstructorLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary">Readiness Analytics</h1>
            <div className="flex items-center gap-3">
              <select
                value={selectedCourseId ?? ''}
                onChange={(e) => setSelectedCourseId(e.target.value || null)}
                className="px-3 py-1.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={selectedExamId ?? ''}
                onChange={(e) => setSelectedExamId(e.target.value || null)}
                className="px-3 py-1.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-8 animate-fade-in">Overview of concept readiness across your class</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`card-elevated p-5 animate-fade-in-up delay-${(i + 1) * 100}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                      <Icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-foreground">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heatmap */}
          <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Readiness Heatmap</h2>
              <div className="flex items-center gap-2 text-xs">
                {readinessLabels.map((label, idx) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: readinessColors[idx] }} />
                    <span className="text-secondary-text">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Concept</th>
                    {readinessLabels.map((label) => (
                      <th key={label} className="text-center py-2 px-3 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((concept) => (
                    <tr key={concept.name} className="border-b border-muted hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/trace/${encodeURIComponent(concept.conceptId || concept.name)}`}
                          className="text-sm font-medium text-primary hover:text-chart-2"
                        >
                          {concept.name}
                        </Link>
                      </td>
                      {concept.readiness.map((count, idx) => (
                        <td key={idx} className="py-2.5 px-3 text-center">
                          <div
                            className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md text-xs font-medium text-white transition-transform hover:scale-105"
                            style={{ backgroundColor: readinessColors[idx] }}
                          >
                            {count}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts + Interventions */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="md:col-span-3 card-elevated p-6 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <h2 className="text-lg font-semibold text-primary">Foundational Alerts</h2>
              </div>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No alerts — all concepts are above threshold.</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Link key={alert.id} href={`/trace/${encodeURIComponent(alert.concept)}`} className="block border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{alert.concept}</div>
                            <div className="text-sm text-secondary-text mt-1">
                              <span className="font-medium text-foreground">{alert.affected}</span> students affected
                              {' \u2022 '}
                              {alert.downstream} downstream concepts
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${alert.severity * 100}%`, background: 'linear-gradient(90deg, var(--destructive), var(--readiness-1))' }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 card-elevated p-6 animate-fade-in-up delay-400">
              <h2 className="text-lg font-semibold text-primary mb-4">Recommended Interventions</h2>
              {interventions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No interventions needed.</p>
              ) : (
                <div className="space-y-3">
                  {interventions.map((item) => (
                    <div key={item.id} className="border border-border rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-amber-400 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0 shadow-sm">
                          {item.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{item.concept}</div>
                          <div className="text-xs text-secondary-text mt-1">{item.description}</div>
                          <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-muted rounded-full text-xs text-primary">
                            {item.affected} students
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clusters */}
          <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-500">
            <h2 className="text-lg font-semibold text-primary mb-4">Student Clusters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cluster.color }} />
                      <h3 className="font-medium text-foreground">{cluster.label}</h3>
                    </div>
                    <span className="text-xs text-secondary-text bg-muted px-2 py-0.5 rounded-full">{cluster.count} students</span>
                  </div>
                  <div className="space-y-2">
                    {cluster.concepts.slice(0, 5).map((concept) => (
                      <div key={concept.name} className="flex items-center justify-between text-sm">
                        <span className="text-secondary-text">{concept.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${concept.avgReadiness * 100}%`, backgroundColor: cluster.color }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{(concept.avgReadiness * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar — Parameters & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up delay-500">
            <div className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-secondary-text">
                  <span className="font-medium text-foreground">Parameters:</span>
                  {' '}&alpha;={params.alpha}, &beta;={params.beta}, &gamma;={params.gamma}, threshold={params.threshold}, k={params.k}
                </div>
                <button onClick={() => setShowParamEditor(true)} className="text-sm text-primary hover:text-chart-2 font-medium inline-flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-secondary-text">
                  <span className="font-medium text-foreground">Quick Actions:</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/student-report" className="text-sm text-primary hover:text-chart-2 font-medium">
                    View Sample Report
                  </Link>
                  <span className="text-border">&bull;</span>
                  <Link href="/suggestions" className="text-sm text-primary hover:text-chart-2 font-medium">
                    AI Suggestions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Editor Modal */}
      {showParamEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-primary">Edit Parameters</h2>
              <button onClick={() => setShowParamEditor(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-5">
              {[
                { key: 'alpha' as const, label: 'Alpha (direct readiness weight)' },
                { key: 'beta' as const, label: 'Beta (prerequisite penalty weight)' },
                { key: 'gamma' as const, label: 'Gamma (downstream boost weight)' },
                { key: 'threshold' as const, label: 'Threshold (weakness cutoff)' },
              ].map((p) => (
                <div key={p.key}>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-secondary-text">{p.label}</label>
                    <span className="text-sm text-primary bg-muted px-2 py-0.5 rounded font-medium">{editParams[p.key].toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={editParams[p.key]}
                    onChange={(e) => setEditParams({ ...editParams, [p.key]: parseFloat(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-secondary-text mb-1.5">K (cluster count)</label>
                <input
                  type="number" min="2" max="10"
                  value={editParams.k}
                  onChange={(e) => setEditParams({ ...editParams, k: parseInt(e.target.value) || 3 })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowParamEditor(false)} className="flex-1 btn-outline py-2.5">Cancel</button>
              <button onClick={handleSaveParams} disabled={savingParams} className="flex-1 btn-primary py-2.5 inline-flex items-center justify-center gap-2">
                {savingParams ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save & Recompute
              </button>
            </div>
          </div>
        </div>
      )}
    </InstructorLayout>
  );
}
