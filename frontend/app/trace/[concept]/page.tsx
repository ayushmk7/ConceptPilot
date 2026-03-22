'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DotPattern } from '@/components/svg/DotPattern';
import { Skeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';
import { themeColor } from '@/lib/theme-colors';

const LazyRecharts = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ data, themeColor: tc }: { data: { name: string; value: number; color: string }[]; themeColor: typeof themeColor }) => (
      <m.ResponsiveContainer width="100%" height={300}>
        <m.BarChart data={data}>
          <m.CartesianGrid strokeDasharray="3 3" stroke={tc.border} />
          <m.XAxis dataKey="name" tick={{ fontSize: 12, fill: tc.secondaryText }} />
          <m.YAxis tick={{ fontSize: 12, fill: tc.secondaryText }} domain={[-0.2, 1]} />
          <m.Tooltip
            contentStyle={{
              backgroundColor: tc.foreground,
              border: 'none',
              borderRadius: '10px',
              color: tc.white,
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
            formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '']}
          />
          <m.Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <m.Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </m.Bar>
        </m.BarChart>
      </m.ResponsiveContainer>
    ),
  }))
);

export default function RootCauseTrace() {
  const { selectedExamId, loading: examLoading } = useExam();
  const params = useParams();
  const conceptName = params.concept ? decodeURIComponent(params.concept as string) : 'Pointers';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<Awaited<ReturnType<typeof api.getTraceData>> | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [viewMode, setViewMode] = useState<'average' | string>('average');

  useEffect(() => {
    if (!selectedExamId) return;
    loadTrace();
  }, [conceptName, selectedExamId]);

  const loadTrace = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTraceData(selectedExamId, conceptName);
      setTraceData(data);
    } catch {
      setError('Failed to load trace data');
    } finally {
      setLoading(false);
    }
  };

  if (error || (!loading && !traceData)) return <InstructorLayout><ErrorState message={error || 'No data'} onRetry={loadTrace} /></InstructorLayout>;

  const isReady = !examLoading && selectedExamId && !loading && traceData;

  const filteredStudents = isReady ? traceData.affectedStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  ) : [];

  return (
    <InstructorLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-6 animate-fade-in">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-3">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-primary">Root-Cause Trace: {conceptName}</h1>
            <p className="text-sm text-muted-foreground mt-1">Understand how readiness is computed for this concept.</p>
          </div>

          {!isReady ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3 card-elevated p-6">
                <Skeleton className="h-6 w-48 mb-6" />
                <Skeleton className="h-[300px] w-full mb-6" />
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              </div>
              <div className="md:col-span-2 space-y-6">
                <div className="card-elevated p-6"><Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-20 w-full" /></div>
                <div className="card-elevated p-6"><Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-20 w-full" /></div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Waterfall chart */}
            <div className="md:col-span-3 card-elevated p-6 animate-fade-in-up delay-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-chart-5" />
                  <h2 className="text-lg font-semibold text-primary">Readiness Composition</h2>
                </div>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="px-3 py-1.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white shadow-sm"
                >
                  <option value="average">Class Average</option>
                  {traceData.affectedStudents.slice(0, 5).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                <LazyRecharts data={traceData.waterfall} themeColor={themeColor} />
              </Suspense>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {traceData.waterfall.map((item) => (
                  <div key={item.name} className="border border-border rounded-xl p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{item.name}</div>
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
                  <div className="w-2 h-2 rounded-full bg-chart-4" />
                  <h3 className="text-base font-semibold text-primary">Upstream Prerequisites</h3>
                </div>
                {traceData.prerequisites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prerequisites for this concept.</p>
                ) : (
                  <div className="space-y-3">
                    {traceData.prerequisites.map((prereq) => (
                      <Link key={prereq.name} href={`/trace/${prereq.name}`} className="flex items-center justify-between hover:bg-muted/50 p-1 -mx-1 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke={prereq.status === 'weak' ? themeColor.destructive : themeColor.input} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className={`text-sm ${prereq.status === 'weak' ? 'text-destructive font-medium' : 'text-foreground'}`}>
                            {prereq.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${prereq.readiness * 100}%`, backgroundColor: prereq.status === 'weak' ? themeColor.destructive : themeColor.chart4 }} />
                          </div>
                          <span className="text-xs text-secondary-text w-8">{(prereq.readiness * 100).toFixed(0)}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Dependents */}
              <div className="card-elevated p-6 animate-fade-in-up delay-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-chart-3" />
                  <h3 className="text-base font-semibold text-primary">Downstream Dependents</h3>
                </div>
                {traceData.dependents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No downstream dependents.</p>
                ) : (
                  <div className="space-y-3">
                    {traceData.dependents.map((dep) => (
                      <Link key={dep.name} href={`/trace/${dep.name}`} className="flex items-center justify-between hover:bg-muted/50 p-1 -mx-1 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke={themeColor.input} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-sm text-foreground">{dep.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-chart-3" style={{ width: `${dep.readiness * 100}%` }} />
                          </div>
                          <span className="text-xs text-secondary-text w-8">{(dep.readiness * 100).toFixed(0)}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Affected Students */}
              <div className="card-elevated p-6 animate-fade-in-up delay-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-primary">Affected Students</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{traceData.totalAffected} total</span>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-muted/50">
                      <span className="text-secondary-text">{student.name}</span>
                      <span className="text-destructive font-medium">{(student.readiness * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No matching students.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
}
