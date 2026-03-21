'use client';

import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { BarChart3, AlertTriangle, BookOpen, TrendingUp, Headphones } from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import type { ConceptReadiness } from '@/lib/types';

const getReadinessColor = (readiness: number) => {
  if (readiness >= 0.8) return '#16A34A';
  if (readiness >= 0.6) return '#22C55E';
  if (readiness >= 0.4) return '#F59E0B';
  if (readiness >= 0.2) return '#F97316';
  return '#DC2626';
};

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<ConceptReadiness[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClassReadiness('e1');
      setConcepts(data);
    } catch {
      setError('Failed to load readiness data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading your readiness data..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadData} /></StudentLayout>;

  const overallReadiness = concepts.reduce((sum, c) => sum + c.readiness, 0) / concepts.length;
  const weakCount = concepts.filter((c) => c.readiness < 0.6).length;

  return (
    <StudentLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-[#00274C] mb-1">Welcome back</h1>
            <p className="text-sm text-[#94A3B8]">EECS 280 &bull; Midterm 1 &bull; Here&apos;s your readiness snapshot.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up delay-100">
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-[#3B82F6]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-[#1A1A2E]">{(overallReadiness * 100).toFixed(0)}%</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Overall Readiness</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-[#16A34A]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-[#1A1A2E]">{concepts.length}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Concepts Assessed</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF8E1] flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-[#F59E0B]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-[#1A1A2E]">{weakCount}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Areas to Improve</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5 text-[#3B82F6]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-[#1A1A2E]">4</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Study Plan Steps</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 card-elevated p-6 animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#00274C]">Concept Readiness</h2>
                <Link href="/student/report" className="text-sm text-[#3B82F6] hover:underline">View full report</Link>
              </div>
              <div className="space-y-3">
                {[...concepts].sort((a, b) => a.readiness - b.readiness).map((concept) => (
                  <div key={concept.concept} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getReadinessColor(concept.readiness) }} />
                      <span className="text-sm font-medium text-[#1A1A2E]">{concept.concept}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${concept.readiness * 100}%`, backgroundColor: getReadinessColor(concept.readiness) }} />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A2E] w-10 text-right">{(concept.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="card-elevated p-6 animate-fade-in-up delay-300">
                <h3 className="text-base font-semibold text-[#00274C] mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/student/study-plan" className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A2E]">View Study Plan</div>
                      <div className="text-xs text-[#94A3B8]">Personalized for your weak areas</div>
                    </div>
                  </Link>
                  <Link href="/student/study-content" className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A2E]">Study Content</div>
                      <div className="text-xs text-[#94A3B8]">Audio, slides, and video walkthroughs</div>
                    </div>
                  </Link>
                  <Link href="/student/upload" className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-[#FFF8E1] flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A2E]">Upload a Test</div>
                      <div className="text-xs text-[#94A3B8]">Analyze another exam</div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="card-elevated p-6 animate-fade-in-up delay-400">
                <h3 className="text-base font-semibold text-[#00274C] mb-4">Focus Areas</h3>
                <div className="space-y-3">
                  {concepts.filter((c) => c.readiness < 0.6).sort((a, b) => a.readiness - b.readiness).slice(0, 3).map((concept) => (
                    <div key={concept.concept} className="flex items-center justify-between">
                      <span className="text-sm text-[#1A1A2E]">{concept.concept}</span>
                      <span className="text-sm font-medium" style={{ color: getReadinessColor(concept.readiness) }}>
                        {(concept.readiness * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/student/study-plan" className="block mt-4 text-center text-sm text-[#3B82F6] hover:underline">
                  Start studying
                </Link>
              </div>

              <div className="card-elevated p-5 animate-fade-in-up delay-500">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  This report is private to you. No student rankings or peer comparisons are shown. All readiness scores reflect your individual concept mastery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
