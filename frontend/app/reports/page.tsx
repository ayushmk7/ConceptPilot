'use client';

import { useState, useEffect, useCallback } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { Download, FileText, Loader2, Link2 } from 'lucide-react';
import { DotPattern } from '@/components/svg/DotPattern';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';

export default function Reports() {
  const { selectedExamId, loading: examLoading } = useExam();
  const [exportId, setExportId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Array<{ student_id: string; token: string }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const loadTokens = useCallback(async () => {
    if (!selectedExamId) return;
    setLoadingTokens(true);
    try {
      const t = await api.listReportTokens(selectedExamId);
      setTokens(t.map((x) => ({ student_id: x.student_id, token: x.token })));
    } catch {
      setTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    if (selectedExamId) loadTokens();
  }, [selectedExamId, loadTokens]);

  const pollExport = async (examId: string, id: string) => {
    for (let i = 0; i < 30; i++) {
      const s = await api.getExportStatus(examId, id);
      if (s.status === 'ready') {
        setStatus('ready');
        return;
      }
      if (s.status === 'error') {
        setStatus('error');
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setStatus('error');
  };

  const handleGenerate = async () => {
    if (!selectedExamId) return;
    setError(null);
    setStatus('generating');
    try {
      const job = await api.createExportJob(selectedExamId);
      setExportId(job.id);
      await pollExport(selectedExamId, job.id);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleDownload = async () => {
    if (!selectedExamId || !exportId) return;
    try {
      const blob = await api.fetchAuthorizedBlob(`/api/v1/exams/${selectedExamId}/export/${exportId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conceptpilot-export-${exportId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  if (examLoading || !selectedExamId) {
    return (
      <InstructorLayout>
        <PageLoader message={!selectedExamId ? 'Select an exam from the dashboard or upload wizard.' : 'Loading…'} />
      </InstructorLayout>
    );
  }

  return (
    <InstructorLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <h1 className="text-2xl font-semibold text-primary mb-2 animate-fade-in">Reports & exports</h1>
          <p className="text-sm text-muted-foreground mb-8 animate-fade-in">
            Generate a Canvas-ready bundle and copy student report links (token-based).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="card-elevated p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted">
                  <FileText className="w-6 h-6 text-chart-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary mb-1">Export bundle</h3>
                  <p className="text-sm text-secondary-text mb-4">Readiness data, graph, and metadata for downstream tools.</p>
                  {error && <p className="text-sm text-destructive mb-2">{error}</p>}
                  <div className="flex items-center gap-3 flex-wrap">
                    {status === 'ready' && exportId ? (
                      <button type="button" onClick={handleDownload} className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
                        <Download className="w-4 h-4" />
                        Download ZIP
                      </button>
                    ) : status === 'generating' ? (
                      <div className="inline-flex items-center gap-2 text-sm text-secondary-text">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Generating…
                      </div>
                    ) : status === 'error' ? (
                      <button type="button" onClick={handleGenerate} className="btn-primary text-sm">
                        Retry export
                      </button>
                    ) : (
                      <button type="button" onClick={handleGenerate} className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
                        <Download className="w-4 h-4" />
                        Generate export
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50">
                  <Link2 className="w-6 h-6 text-chart-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary mb-1">Student report links</h3>
                  <p className="text-sm text-secondary-text mb-3">Share read-only links (after compute has run).</p>
                  {loadingTokens ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : tokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tokens yet — run compute first.</p>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto space-y-2 text-xs">
                      {tokens.map((t) => {
                        const href =
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/access/${t.token}`
                            : `/access/${t.token}`;
                        return (
                          <li key={t.student_id} className="flex justify-between gap-2 border border-border rounded-lg px-2 py-1.5">
                            <span className="font-mono text-secondary-text truncate">{t.student_id}</span>
                            <button
                              type="button"
                              className="text-primary shrink-0"
                              onClick={() => navigator.clipboard.writeText(href)}
                            >
                              Copy link
                            </button>
                          </li>
                        );
                      })}
                    </ul>
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
