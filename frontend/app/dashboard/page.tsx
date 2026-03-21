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

const readinessColors = ['#DC2626', '#F97316', '#F59E0B', '#22C55E', '#16A34A'];
const readinessLabels = ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<{ name: string; readiness: number[] }[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [params, setParams] = useState<ReadinessParams>({ alpha: 0.5, beta: 0.3, gamma: 0.2, threshold: 0.6, k: 3 });
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [editParams, setEditParams] = useState<ReadinessParams>(params);
  const [savingParams, setSavingParams] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hm, al, iv, cl, p, students] = await Promise.all([
        api.getHeatmapData('e1'),
        api.getAlerts('e1'),
        api.getInterventions('e1'),
        api.getClusters('e1'),
        api.getReadinessParams('e1'),
        api.getStudentsList('e1'),
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
    setSavingParams(true);
    try {
      const updated = await api.updateReadinessParams('e1', editParams);
      setParams(updated);
      setShowParamEditor(false);
    } catch {
      // handled
    } finally {
      setSavingParams(false);
    }
  };

  if (loading) return <InstructorLayout><DashboardSkeleton /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadData} /></InstructorLayout>;

  const stats = [
    { label: 'Total Students', value: String(totalStudents), icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Concepts', value: String(heatmapData.length), icon: BookOpen, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Active Alerts', value: String(alerts.length), icon: Bell, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Interventions', value: String(interventions.length), icon: Lightbulb, color: '#F59E0B', bg: '#FFF8E1' },
  ];

  return (
    <InstructorLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 animate-fade-in">
            <h1 className="text-2xl font-semibold text-[#00274C]">Readiness Analytics</h1>
            <div className="flex items-center gap-3">
              <select className="px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white shadow-sm">
                <option>EECS 280</option>
                <option>EECS 281</option>
              </select>
              <select className="px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white shadow-sm">
                <option>Midterm 1</option>
                <option>Midterm 2</option>
                <option>Final</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-[#94A3B8] mb-8 animate-fade-in">Overview of concept readiness across your class</p>

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
                      <div className="text-2xl font-semibold text-[#1A1A2E]">{s.value}</div>
                      <div className="text-xs text-[#94A3B8]">{s.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heatmap */}
          <div className="card-elevated p-6 mb-6 animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#00274C]">Readiness Heatmap</h2>
              <div className="flex items-center gap-2 text-xs">
                {readinessLabels.map((label, idx) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: readinessColors[idx] }} />
                    <span className="text-[#4A5568]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Concept</th>
                    {readinessLabels.map((label) => (
                      <th key={label} className="text-center py-2 px-3 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((concept) => (
                    <tr key={concept.name} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3">
                        <Link href={`/trace/${concept.name}`} className="text-sm font-medium text-[#00274C] hover:text-[#1B365D]">
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
                <div className="w-2 h-2 rounded-full bg-[#DC2626]" />
                <h2 className="text-lg font-semibold text-[#00274C]">Foundational Alerts</h2>
              </div>
              {alerts.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-6">No alerts — all concepts are above threshold.</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Link key={alert.id} href={`/trace/${alert.concept}`} className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#00274C]/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                          </div>
                          <div>
                            <div className="font-medium text-[#1A1A2E]">{alert.concept}</div>
                            <div className="text-sm text-[#4A5568] mt-1">
                              <span className="font-medium text-[#1A1A2E]">{alert.affected}</span> students affected
                              {' \u2022 '}
                              {alert.downstream} downstream concepts
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${alert.severity * 100}%`, background: 'linear-gradient(90deg, #DC2626, #F97316)' }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 card-elevated p-6 animate-fade-in-up delay-400">
              <h2 className="text-lg font-semibold text-[#00274C] mb-4">Recommended Interventions</h2>
              {interventions.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-6">No interventions needed.</p>
              ) : (
                <div className="space-y-3">
                  {interventions.map((item) => (
                    <div key={item.id} className="border border-[#E2E8F0] rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFCB05] to-[#f0be00] flex items-center justify-center text-[#00274C] text-xs font-semibold flex-shrink-0 shadow-sm">
                          {item.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#1A1A2E]">{item.concept}</div>
                          <div className="text-xs text-[#4A5568] mt-1">{item.description}</div>
                          <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-[#F1F5F9] rounded-full text-xs text-[#00274C]">
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
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Student Clusters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="border border-[#E2E8F0] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cluster.color }} />
                      <h3 className="font-medium text-[#1A1A2E]">{cluster.label}</h3>
                    </div>
                    <span className="text-xs text-[#4A5568] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{cluster.count} students</span>
                  </div>
                  <div className="space-y-2">
                    {cluster.concepts.slice(0, 5).map((concept) => (
                      <div key={concept.name} className="flex items-center justify-between text-sm">
                        <span className="text-[#4A5568]">{concept.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${concept.avgReadiness * 100}%`, backgroundColor: cluster.color }} />
                          </div>
                          <span className="text-xs text-[#94A3B8] w-8 text-right">{(concept.avgReadiness * 100).toFixed(0)}%</span>
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
                <div className="text-sm text-[#4A5568]">
                  <span className="font-medium text-[#1A1A2E]">Parameters:</span>
                  {' '}&alpha;={params.alpha}, &beta;={params.beta}, &gamma;={params.gamma}, threshold={params.threshold}, k={params.k}
                </div>
                <button onClick={() => setShowParamEditor(true)} className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium inline-flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#4A5568]">
                  <span className="font-medium text-[#1A1A2E]">Quick Actions:</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/student-report" className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium">
                    View Sample Report
                  </Link>
                  <span className="text-[#E2E8F0]">&bull;</span>
                  <Link href="/suggestions" className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium">
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
              <h2 className="text-lg font-semibold text-[#00274C]">Edit Parameters</h2>
              <button onClick={() => setShowParamEditor(false)} className="p-1 hover:bg-[#F1F5F9] rounded-lg">
                <X className="w-5 h-5 text-[#94A3B8]" />
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
                    <label className="text-sm font-medium text-[#4A5568]">{p.label}</label>
                    <span className="text-sm text-[#00274C] bg-[#E8EEF4] px-2 py-0.5 rounded font-medium">{editParams[p.key].toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={editParams[p.key]}
                    onChange={(e) => setEditParams({ ...editParams, [p.key]: parseFloat(e.target.value) })}
                    className="w-full accent-[#00274C]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1.5">K (cluster count)</label>
                <input
                  type="number" min="2" max="10"
                  value={editParams.k}
                  onChange={(e) => setEditParams({ ...editParams, k: parseInt(e.target.value) || 3 })}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20"
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
