'use client';

import { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DotPattern } from '@/components/svg/DotPattern';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';

export default function RootCauseTrace() {
  const params = useParams();
  const conceptName = params.concept ? decodeURIComponent(params.concept as string) : 'Pointers';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<Awaited<ReturnType<typeof api.getTraceData>> | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [viewMode, setViewMode] = useState<'average' | string>('average');

  useEffect(() => {
    loadTrace();
  }, [conceptName]);

  const loadTrace = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTraceData('e1', conceptName);
      setTraceData(data);
    } catch {
      setError('Failed to load trace data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <InstructorLayout><PageLoader message={`Loading trace for ${conceptName}...`} /></InstructorLayout>;
  if (error || !traceData) return <InstructorLayout><ErrorState message={error || 'No data'} onRetry={loadTrace} /></InstructorLayout>;

  const filteredStudents = traceData.affectedStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="mb-6 animate-fade-in">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#00274C] transition-colors mb-3">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-[#00274C]">Root-Cause Trace: {conceptName}</h1>
            <p className="text-sm text-[#94A3B8] mt-1">Understand how readiness is computed for this concept.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Waterfall chart */}
            <div className="md:col-span-3 card-elevated p-6 animate-fade-in-up delay-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                  <h2 className="text-lg font-semibold text-[#00274C]">Readiness Composition</h2>
                </div>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white shadow-sm"
                >
                  <option value="average">Class Average</option>
                  {traceData.affectedStudents.slice(0, 5).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={traceData.waterfall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A5568' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#4A5568' }} domain={[-0.2, 1]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A2E',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {traceData.waterfall.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {traceData.waterfall.map((item) => (
                  <div key={item.name} className="border border-[#E2E8F0] rounded-xl p-3 text-center">
                    <div className="text-xs text-[#94A3B8] mb-1">{item.name}</div>
                    <div className="text-xl font-semibold" style={{ color: item.color }}>
                      {item.value >= 0 ? '+' : ''}{(item.value * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="md:col-span-2 space-y-6">
              {/* Prerequisites */}
              <div className="card-elevated p-6 animate-fade-in-up delay-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <h3 className="text-base font-semibold text-[#00274C]">Upstream Prerequisites</h3>
                </div>
                {traceData.prerequisites.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No prerequisites for this concept.</p>
                ) : (
                  <div className="space-y-3">
                    {traceData.prerequisites.map((prereq) => (
                      <Link key={prereq.name} href={`/trace/${prereq.name}`} className="flex items-center justify-between hover:bg-[#F8FAFC] p-1 -mx-1 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke={prereq.status === 'weak' ? '#DC2626' : '#CBD5E1'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className={`text-sm ${prereq.status === 'weak' ? 'text-[#DC2626] font-medium' : 'text-[#1A1A2E]'}`}>
                            {prereq.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${prereq.readiness * 100}%`, backgroundColor: prereq.status === 'weak' ? '#DC2626' : '#16A34A' }} />
                          </div>
                          <span className="text-xs text-[#4A5568] w-8">{(prereq.readiness * 100).toFixed(0)}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Dependents */}
              <div className="card-elevated p-6 animate-fade-in-up delay-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <h3 className="text-base font-semibold text-[#00274C]">Downstream Dependents</h3>
                </div>
                {traceData.dependents.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No downstream dependents.</p>
                ) : (
                  <div className="space-y-3">
                    {traceData.dependents.map((dep) => (
                      <Link key={dep.name} href={`/trace/${dep.name}`} className="flex items-center justify-between hover:bg-[#F8FAFC] p-1 -mx-1 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-sm text-[#1A1A2E]">{dep.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${dep.readiness * 100}%` }} />
                          </div>
                          <span className="text-xs text-[#4A5568] w-8">{(dep.readiness * 100).toFixed(0)}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Affected Students */}
              <div className="card-elevated p-6 animate-fade-in-up delay-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[#00274C]">Affected Students</h3>
                  <span className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{traceData.totalAffected} total</span>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]/20"
                  />
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-[#F8FAFC]">
                      <span className="text-[#4A5568]">{student.name}</span>
                      <span className="text-[#DC2626] font-medium">{(student.readiness * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-xs text-[#94A3B8] text-center py-4">No matching students.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
