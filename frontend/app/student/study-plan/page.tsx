'use client';

import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { BookOpen, CheckCircle2, Circle, ChevronRight, Headphones, Presentation, Video } from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import * as api from '@/lib/api';
import type { StudyPlanStep } from '@/lib/types';
import { readinessColorFromScore } from '@/lib/theme-colors';

export default function StudyPlan() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlanStep[]>([]);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudyPlan('', '');
      setPlan(data);
    } catch {
      setError('Failed to load study plan. Open your access link again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading your study plan..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadPlan} /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="relative max-w-4xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Your Study Plan</h1>
            <p className="text-sm text-muted-foreground">Ordered by prerequisite dependencies — build foundational concepts before advancing.</p>
          </div>

          <div className="card-elevated p-5 mb-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-chart-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{plan.length} concepts to review</div>
                <div className="text-xs text-muted-foreground">Estimated study time: 4–6 hours &bull; Focus on steps in order for best results</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {plan.map((item, idx) => (
              <div key={item.step} className={`card-elevated p-6 animate-fade-in-up delay-${(idx + 2) * 100}`}>
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chart-5 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {item.step}
                    </div>
                    {idx < plan.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-primary">{item.concept}</h3>
                        <p className="text-sm text-secondary-text mt-0.5">{item.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.readiness * 100}%`, backgroundColor: readinessColorFromScore(item.readiness) }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: readinessColorFromScore(item.readiness) }}>
                          {(item.readiness * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Prerequisites:</span>
                      {item.prerequisites.map((prereq) => (
                        <span key={prereq} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-secondary-text">
                          {item.prereqReady ? <CheckCircle2 className="w-3 h-3 text-chart-4" /> : <Circle className="w-3 h-3 text-muted-foreground" />}
                          {prereq}
                        </span>
                      ))}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Topics to review</div>
                      <div className="space-y-1.5">
                        {item.topics.map((topic) => (
                          <div key={topic} className="flex items-center gap-2 text-sm text-secondary-text">
                            <ChevronRight className="w-3 h-3 text-input flex-shrink-0" />
                            {topic}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resources */}
          <div className="card-elevated p-6 animate-fade-in-up delay-500">
            <h2 className="text-lg font-semibold text-primary mb-4">Study Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/student/study-content" className="border border-border rounded-xl p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-chart-5" />
                  <div className="text-sm font-medium text-foreground">Audio Summary</div>
                </div>
                <div className="text-xs text-muted-foreground">Listen to a concept review narrated by AI</div>
              </Link>
              <Link href="/student/study-content" className="border border-border rounded-xl p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Presentation className="w-4 h-4 text-chart-3" />
                  <div className="text-sm font-medium text-foreground">Slide Deck</div>
                </div>
                <div className="text-xs text-muted-foreground">Review auto-generated presentation materials</div>
              </Link>
              <Link href="/student/study-content" className="border border-border rounded-xl p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-chart-4" />
                  <div className="text-sm font-medium text-foreground">Video Walkthrough</div>
                </div>
                <div className="text-xs text-muted-foreground">Narrated slides covering your weak areas</div>
              </Link>
            </div>
          </div>

          <div className="mt-6 card-elevated p-5 animate-fade-in-up delay-500">
            <h3 className="text-sm font-semibold text-primary mb-1">Need help?</h3>
            <p className="text-xs text-secondary-text">Contact your instructor or TA for additional guidance: Prof. Smith (smith@umich.edu)</p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">This study plan is personalized for you. No peer comparisons or rankings are shown.</p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
