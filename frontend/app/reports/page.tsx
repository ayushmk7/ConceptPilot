'use client';

import { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { Download, FileText, Users, BarChart3, Loader2, Check, ExternalLink } from 'lucide-react';
import { DotPattern } from '@/components/svg/DotPattern';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { ReportConfig } from '@/lib/types';
import * as api from '@/lib/api';

const reportIcons: Record<string, typeof BarChart3> = {
  r1: BarChart3,
  r2: Users,
  r3: FileText,
  r4: FileText,
};

const reportColors: Record<string, { color: string; bg: string }> = {
  r1: { color: '#3B82F6', bg: '#EFF6FF' },
  r2: { color: '#16A34A', bg: '#F0FDF4' },
  r3: { color: '#F59E0B', bg: '#FFF8E1' },
  r4: { color: '#00274C', bg: '#E8EEF4' },
};

export default function Reports() {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReportConfigs('e1');
      setReports(data);
    } catch {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (reportId: string) => {
    setGeneratingId(reportId);
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: 'generating' as const } : r));
    try {
      const result = await api.generateReport(reportId);
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: result.status, downloadUrl: result.downloadUrl, generatedAt: result.generatedAt } : r));
    } catch {
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: 'error' as const } : r));
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) return <InstructorLayout><PageLoader message="Loading reports..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadReports} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <h1 className="text-2xl font-semibold text-[#00274C] mb-2 animate-fade-in">Reports</h1>
          <p className="text-sm text-[#94A3B8] mb-8 animate-fade-in">Generate and export analytics for your class.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((r, i) => {
              const Icon = reportIcons[r.id] || FileText;
              const colors = reportColors[r.id] || { color: '#94A3B8', bg: '#F1F5F9' };
              const isGenerating = generatingId === r.id;

              return (
                <div key={r.id} className={`card-elevated p-6 animate-fade-in-up delay-${(i + 1) * 100}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.bg }}>
                      <Icon className="w-6 h-6" style={{ color: colors.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#00274C] mb-1">{r.title}</h3>
                      <p className="text-sm text-[#4A5568] mb-4">{r.description}</p>

                      <div className="flex items-center gap-3">
                        {r.status === 'ready' ? (
                          <>
                            <a href={r.downloadUrl || '#'} className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
                              <Download className="w-4 h-4" />
                              Download {r.format.toUpperCase()}
                            </a>
                            <span className="text-xs text-[#94A3B8]">
                              Generated {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : 'just now'}
                            </span>
                          </>
                        ) : r.status === 'generating' || isGenerating ? (
                          <div className="inline-flex items-center gap-2 text-sm text-[#4A5568]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#00274C]" />
                            Generating...
                          </div>
                        ) : r.status === 'error' ? (
                          <button onClick={() => handleGenerate(r.id)} className="text-sm text-[#DC2626] hover:underline inline-flex items-center gap-1">
                            Failed — click to retry
                          </button>
                        ) : (
                          <button onClick={() => handleGenerate(r.id)} className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
                            <Download className="w-4 h-4" />
                            Generate {r.format.toUpperCase()}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
