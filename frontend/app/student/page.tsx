'use client';

import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { BarChart3, AlertTriangle, BookOpen, TrendingUp, Headphones, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import type { ConceptReadiness } from '@/lib/types';
import { readinessColorFromScore } from '@/lib/theme-colors';

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
      const data = await api.getStudentReadiness('', '');
      setConcepts(data.concepts);
    } catch {
      setError('Failed to load readiness data. Open your access link again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading your readiness data..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadData} /></StudentLayout>;

  const overallReadiness =
    concepts.length > 0 ? concepts.reduce((sum, c) => sum + c.readiness, 0) / concepts.length : 0;
  const weakCount = concepts.filter((c) => c.readiness < 0.6).length;

  return (
    <StudentLayout>
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground">EECS 280 &bull; Midterm 1 &bull; Here&apos;s your readiness snapshot.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up delay-100">
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-chart-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-foreground">{(overallReadiness * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Overall Readiness</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-chart-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-foreground">{concepts.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Concepts Assessed</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-chart-3" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-foreground">{weakCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Areas to Improve</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5 text-chart-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-foreground">4</div>
              <div className="text-xs text-muted-foreground mt-0.5">Study Plan Steps</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 card-elevated p-6 animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-primary">Concept Readiness</h2>
                <Link href="/student/report" className="text-sm text-chart-5 hover:underline">View full report</Link>
              </div>
              <div className="space-y-3">
                {[...concepts].sort((a, b) => a.readiness - b.readiness).map((concept) => (
                  <div key={concept.concept} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: readinessColorFromScore(concept.readiness) }} />
                      <span className="text-sm font-medium text-foreground">{concept.concept}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${concept.readiness * 100}%`, backgroundColor: readinessColorFromScore(concept.readiness) }} />
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{(concept.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="card-elevated p-6 animate-fade-in-up delay-300">
                <h3 className="text-base font-semibold text-primary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/student/study-plan" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-chart-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">View Study Plan</div>
                      <div className="text-xs text-muted-foreground">Personalized for your weak areas</div>
                    </div>
                  </Link>
                  <Link href="/student/study-content" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-4 h-4 text-chart-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Study Content</div>
                      <div className="text-xs text-muted-foreground">Audio, slides, and video walkthroughs</div>
                    </div>
                  </Link>
                  <Link href="/student/upload" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-chart-3" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Upload a Test</div>
                      <div className="text-xs text-muted-foreground">Analyze another exam</div>
                    </div>
                  </Link>
                  <Link href="/canvas?role=student" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-chart-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Open Infinite Canvas</div>
                      <div className="text-xs text-muted-foreground">Brainstorm and map your understanding</div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="card-elevated p-6 animate-fade-in-up delay-400">
                <h3 className="text-base font-semibold text-primary mb-4">Focus Areas</h3>
                <div className="space-y-3">
                  {concepts.filter((c) => c.readiness < 0.6).sort((a, b) => a.readiness - b.readiness).slice(0, 3).map((concept) => (
                    <div key={concept.concept} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{concept.concept}</span>
                      <span className="text-sm font-medium" style={{ color: readinessColorFromScore(concept.readiness) }}>
                        {(concept.readiness * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/student/study-plan" className="block mt-4 text-center text-sm text-chart-5 hover:underline">
                  Start studying
                </Link>
              </div>

              <div className="card-elevated p-5 animate-fade-in-up delay-500">
                <p className="text-xs text-muted-foreground leading-relaxed">
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
