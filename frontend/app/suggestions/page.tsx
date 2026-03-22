'use client';

import React, { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { Check, X, ChevronDown, Sparkles, Loader2, Clock, Cpu, Hash, FileText } from 'lucide-react';
import { DotPattern } from '@/components/svg/DotPattern';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { AISuggestion } from '@/lib/types';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';

export default function AISuggestions() {
  const { selectedExamId, loading: examLoading } = useExam();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    if (!selectedExamId) return;
    loadSuggestions();
  }, [selectedExamId]);

  const loadSuggestions = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuggestions(selectedExamId);
      setSuggestions(data);
    } catch {
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, action: 'accept' | 'reject') => {
    if (!selectedExamId) return;
    setProcessingId(id);
    try {
      const updated = await api.reviewSuggestion(selectedExamId, id, action);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      // handled
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAction = async (action: 'accept' | 'reject') => {
    const pending = suggestions.filter((s) => s.status === 'pending');
    for (const s of pending) {
      await handleReview(s.id, action);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-chart-4/10 text-chart-4 border border-chart-4/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border border-destructive/20';
      default: return 'bg-chart-3/10 text-chart-3 border border-chart-3/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Edge': return 'bg-chart-5/10 text-chart-5 border border-chart-5/20';
      case 'Concept Tag': return 'bg-accent/20 text-primary border border-accent/30';
      case 'Intervention': return 'bg-chart-4/10 text-chart-4 border border-chart-4/20';
      case 'Graph Expansion': return 'bg-purple-600/10 text-purple-600 border border-purple-600/20';
      default: return 'bg-muted text-primary';
    }
  };

  const filteredSuggestions = filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter);
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  if (examLoading || !selectedExamId) {
    return (
      <InstructorLayout>
        <PageLoader message={!selectedExamId ? 'Select an exam from the dashboard or upload wizard.' : 'Loading…'} />
      </InstructorLayout>
    );
  }

  if (loading) return <InstructorLayout><PageLoader message="Loading AI suggestions..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadSuggestions} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="flex items-center justify-between mb-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h1 className="text-2xl font-semibold text-primary">AI Suggestions Review</h1>
              {pendingCount > 0 && (
                <span className="text-xs bg-chart-3/20 text-chart-3 px-2 py-0.5 rounded-full font-medium">{pendingCount} pending</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('accept')}
                disabled={pendingCount === 0}
                className="px-4 py-2 border border-chart-4 text-chart-4 rounded-lg hover:bg-chart-4/10 transition-colors text-sm font-medium disabled:opacity-40"
              >
                Accept All Pending
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={pendingCount === 0}
                className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-medium disabled:opacity-40"
              >
                Reject All Pending
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-6 animate-fade-in">Review and manage AI-generated suggestions for your concept graph.</p>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 animate-fade-in">
            {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-muted text-secondary-text hover:bg-muted'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${suggestions.filter((s) => s.status === f).length})`}
              </button>
            ))}
          </div>

          <div className="card-elevated overflow-hidden animate-fade-in-up delay-100">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Preview</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Created</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuggestions.map((suggestion) => (
                  <React.Fragment key={suggestion.id}>
                    <tr
                      className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(suggestion.type)}`}>
                          {suggestion.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{suggestion.preview}</span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === suggestion.id ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-secondary-text">{suggestion.created}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(suggestion.status)}`}>
                          {suggestion.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {suggestion.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {processingId === suggestion.id ? (
                              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                            ) : (
                              <>
                                <button onClick={() => handleReview(suggestion.id, 'accept')} className="p-1.5 hover:bg-chart-4/10 rounded-lg transition-colors" title="Accept">
                                  <Check className="w-4 h-4 text-chart-4" />
                                </button>
                                <button onClick={() => handleReview(suggestion.id, 'reject')} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors" title="Reject">
                                  <X className="w-4 h-4 text-destructive" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === suggestion.id && (
                      <tr className="bg-muted/50">
                        <td colSpan={5} className="py-4 px-4">
                          <div className="text-sm text-secondary-text">
                            <p className="mb-4">{suggestion.details}</p>

                            {suggestion.type === 'Edge' && (
                              <div className="border border-border rounded-xl bg-white p-4 mb-4">
                                <p className="text-xs text-muted-foreground mb-3">Graph Preview</p>
                                <div className="flex items-center gap-3">
                                  <div className="px-4 py-2.5 bg-muted rounded-lg text-sm text-primary font-medium">
                                    {suggestion.preview.split(' → ')[0]}
                                  </div>
                                  <svg width="80" height="20" className="flex-shrink-0">
                                    <defs>
                                      <marker id={`edge-arrow-${suggestion.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                        <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
                                      </marker>
                                    </defs>
                                    <line x1="0" y1="10" x2="68" y2="10" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" markerEnd={`url(#edge-arrow-${suggestion.id})`} />
                                  </svg>
                                  <div className="px-4 py-2.5 bg-muted rounded-lg text-sm text-primary font-medium">
                                    {suggestion.preview.split(' → ')[1]}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* AI Metadata */}
                            <div className="border border-border rounded-xl bg-white p-4">
                              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">AI Metadata</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <div className="text-[10px] text-muted-foreground">Model</div>
                                    <div className="text-xs font-medium text-foreground">{suggestion.metadata.model}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <div className="text-[10px] text-muted-foreground">Prompt Version</div>
                                    <div className="text-xs font-medium text-foreground">{suggestion.metadata.promptVersion}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <div className="text-[10px] text-muted-foreground">Request ID</div>
                                    <div className="text-xs font-medium text-foreground font-mono">{String(suggestion.metadata.requestId).slice(0, 12)}...</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <div className="text-[10px] text-muted-foreground">Latency / Tokens</div>
                                    <div className="text-xs font-medium text-foreground">{suggestion.metadata.latencyMs}ms &bull; {suggestion.metadata.tokenUsage.input + suggestion.metadata.tokenUsage.output} tok</div>
                                  </div>
                                </div>
                              </div>
                              {suggestion.metadata.reviewedAt && (
                                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                                  Reviewed by {suggestion.metadata.reviewedBy} on {new Date(suggestion.metadata.reviewedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {filteredSuggestions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No suggestions match the current filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
