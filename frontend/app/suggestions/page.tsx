'use client';

import React, { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { Check, X, ChevronDown, Sparkles, Loader2, Clock, Cpu, Hash, FileText } from 'lucide-react';
import { DotPattern } from '@/components/svg/DotPattern';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { AISuggestion } from '@/lib/types';
import * as api from '@/lib/api';

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuggestions('e1');
      setSuggestions(data);
    } catch {
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: number, action: 'accept' | 'reject') => {
    setProcessingId(id);
    try {
      const updated = await api.reviewSuggestion(id, action);
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
      case 'accepted': return 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20';
      case 'rejected': return 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20';
      default: return 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Edge': return 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20';
      case 'Concept Tag': return 'bg-[#FFCB05]/20 text-[#00274C] border border-[#FFCB05]/30';
      case 'Intervention': return 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20';
      case 'Graph Expansion': return 'bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20';
      default: return 'bg-[#E8EEF4] text-[#00274C]';
    }
  };

  const filteredSuggestions = filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter);
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  if (loading) return <InstructorLayout><PageLoader message="Loading AI suggestions..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadSuggestions} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="flex items-center justify-between mb-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFCB05]" />
              <h1 className="text-2xl font-semibold text-[#00274C]">AI Suggestions Review</h1>
              {pendingCount > 0 && (
                <span className="text-xs bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded-full font-medium">{pendingCount} pending</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('accept')}
                disabled={pendingCount === 0}
                className="px-4 py-2 border border-[#16A34A] text-[#16A34A] rounded-lg hover:bg-[#16A34A]/10 transition-colors text-sm font-medium disabled:opacity-40"
              >
                Accept All Pending
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={pendingCount === 0}
                className="px-4 py-2 border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-[#DC2626]/10 transition-colors text-sm font-medium disabled:opacity-40"
              >
                Reject All Pending
              </button>
            </div>
          </div>
          <p className="text-sm text-[#94A3B8] mb-6 animate-fade-in">Review and manage AI-generated suggestions for your concept graph.</p>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 animate-fade-in">
            {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-[#00274C] text-white' : 'bg-[#F1F5F9] text-[#4A5568] hover:bg-[#E8EEF4]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${suggestions.filter((s) => s.status === f).length})`}
              </button>
            ))}
          </div>

          <div className="card-elevated overflow-hidden animate-fade-in-up delay-100">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Preview</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Created</th>
                  <th className="text-left py-3 px-4 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-[#94A3B8] tracking-wider uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuggestions.map((suggestion) => (
                  <React.Fragment key={suggestion.id}>
                    <tr
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(suggestion.type)}`}>
                          {suggestion.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#1A1A2E]">{suggestion.preview}</span>
                          <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform ${expandedId === suggestion.id ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[#4A5568]">{suggestion.created}</span>
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
                              <Loader2 className="w-4 h-4 text-[#94A3B8] animate-spin" />
                            ) : (
                              <>
                                <button onClick={() => handleReview(suggestion.id, 'accept')} className="p-1.5 hover:bg-[#16A34A]/10 rounded-lg transition-colors" title="Accept">
                                  <Check className="w-4 h-4 text-[#16A34A]" />
                                </button>
                                <button onClick={() => handleReview(suggestion.id, 'reject')} className="p-1.5 hover:bg-[#DC2626]/10 rounded-lg transition-colors" title="Reject">
                                  <X className="w-4 h-4 text-[#DC2626]" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === suggestion.id && (
                      <tr className="bg-[#F8FAFC]">
                        <td colSpan={5} className="py-4 px-4">
                          <div className="text-sm text-[#4A5568]">
                            <p className="mb-4">{suggestion.details}</p>

                            {suggestion.type === 'Edge' && (
                              <div className="border border-[#E2E8F0] rounded-xl bg-white p-4 mb-4">
                                <p className="text-xs text-[#94A3B8] mb-3">Graph Preview</p>
                                <div className="flex items-center gap-3">
                                  <div className="px-4 py-2.5 bg-[#E8EEF4] rounded-lg text-sm text-[#00274C] font-medium">
                                    {suggestion.preview.split(' → ')[0]}
                                  </div>
                                  <svg width="80" height="20" className="flex-shrink-0">
                                    <defs>
                                      <marker id={`edge-arrow-${suggestion.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                        <polygon points="0 0, 8 3, 0 6" fill="#FFCB05" />
                                      </marker>
                                    </defs>
                                    <line x1="0" y1="10" x2="68" y2="10" stroke="#FFCB05" strokeWidth="2" strokeDasharray="4 3" markerEnd={`url(#edge-arrow-${suggestion.id})`} />
                                  </svg>
                                  <div className="px-4 py-2.5 bg-[#E8EEF4] rounded-lg text-sm text-[#00274C] font-medium">
                                    {suggestion.preview.split(' → ')[1]}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* AI Metadata */}
                            <div className="border border-[#E2E8F0] rounded-xl bg-white p-4">
                              <p className="text-xs font-semibold text-[#94A3B8] tracking-wider uppercase mb-3">AI Metadata</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <Cpu className="w-3.5 h-3.5 text-[#94A3B8]" />
                                  <div>
                                    <div className="text-[10px] text-[#94A3B8]">Model</div>
                                    <div className="text-xs font-medium text-[#1A1A2E]">{suggestion.metadata.model}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-[#94A3B8]" />
                                  <div>
                                    <div className="text-[10px] text-[#94A3B8]">Prompt Version</div>
                                    <div className="text-xs font-medium text-[#1A1A2E]">{suggestion.metadata.promptVersion}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3.5 h-3.5 text-[#94A3B8]" />
                                  <div>
                                    <div className="text-[10px] text-[#94A3B8]">Request ID</div>
                                    <div className="text-xs font-medium text-[#1A1A2E] font-mono">{suggestion.metadata.requestId.slice(0, 12)}...</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                                  <div>
                                    <div className="text-[10px] text-[#94A3B8]">Latency / Tokens</div>
                                    <div className="text-xs font-medium text-[#1A1A2E]">{suggestion.metadata.latencyMs}ms &bull; {suggestion.metadata.tokenUsage.input + suggestion.metadata.tokenUsage.output} tok</div>
                                  </div>
                                </div>
                              </div>
                              {suggestion.metadata.reviewedAt && (
                                <div className="mt-3 pt-3 border-t border-[#E2E8F0] text-xs text-[#94A3B8]">
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
                <p className="text-sm text-[#94A3B8]">No suggestions match the current filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
