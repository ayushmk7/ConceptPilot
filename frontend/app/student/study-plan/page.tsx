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

const getReadinessColor = (readiness: number) => {
  if (readiness >= 0.8) return '#16A34A';
  if (readiness >= 0.6) return '#22C55E';
  if (readiness >= 0.4) return '#F59E0B';
  if (readiness >= 0.2) return '#F97316';
  return '#DC2626';
};

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
      const data = await api.getStudyPlan('u2', 'e1');
      setPlan(data);
    } catch {
      setError('Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading your study plan..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadPlan} /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="relative max-w-4xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-[#00274C] mb-1">Your Study Plan</h1>
            <p className="text-sm text-[#94A3B8]">Ordered by prerequisite dependencies — build foundational concepts before advancing.</p>
          </div>

          <div className="card-elevated p-5 mb-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1A1A2E]">{plan.length} concepts to review</div>
                <div className="text-xs text-[#94A3B8]">Estimated study time: 4–6 hours &bull; Focus on steps in order for best results</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {plan.map((item, idx) => (
              <div key={item.step} className={`card-elevated p-6 animate-fade-in-up delay-${(idx + 2) * 100}`}>
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {item.step}
                    </div>
                    {idx < plan.length - 1 && <div className="w-0.5 flex-1 bg-[#E2E8F0] mt-2" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-[#00274C]">{item.concept}</h3>
                        <p className="text-sm text-[#4A5568] mt-0.5">{item.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <div className="w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.readiness * 100}%`, backgroundColor: getReadinessColor(item.readiness) }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: getReadinessColor(item.readiness) }}>
                          {(item.readiness * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-[#94A3B8]">Prerequisites:</span>
                      {item.prerequisites.map((prereq) => (
                        <span key={prereq} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#4A5568]">
                          {item.prereqReady ? <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> : <Circle className="w-3 h-3 text-[#94A3B8]" />}
                          {prereq}
                        </span>
                      ))}
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
                      <div className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Topics to review</div>
                      <div className="space-y-1.5">
                        {item.topics.map((topic) => (
                          <div key={topic} className="flex items-center gap-2 text-sm text-[#4A5568]">
                            <ChevronRight className="w-3 h-3 text-[#CBD5E1] flex-shrink-0" />
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
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Study Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/student/study-content" className="border border-[#E2E8F0] rounded-xl p-4 text-left hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-[#3B82F6]" />
                  <div className="text-sm font-medium text-[#1A1A2E]">Audio Summary</div>
                </div>
                <div className="text-xs text-[#94A3B8]">Listen to a concept review narrated by AI</div>
              </Link>
              <Link href="/student/study-content" className="border border-[#E2E8F0] rounded-xl p-4 text-left hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Presentation className="w-4 h-4 text-[#F59E0B]" />
                  <div className="text-sm font-medium text-[#1A1A2E]">Slide Deck</div>
                </div>
                <div className="text-xs text-[#94A3B8]">Review auto-generated presentation materials</div>
              </Link>
              <Link href="/student/study-content" className="border border-[#E2E8F0] rounded-xl p-4 text-left hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-[#16A34A]" />
                  <div className="text-sm font-medium text-[#1A1A2E]">Video Walkthrough</div>
                </div>
                <div className="text-xs text-[#94A3B8]">Narrated slides covering your weak areas</div>
              </Link>
            </div>
          </div>

          <div className="mt-6 card-elevated p-5 animate-fade-in-up delay-500">
            <h3 className="text-sm font-semibold text-[#00274C] mb-1">Need help?</h3>
            <p className="text-xs text-[#4A5568]">Contact your instructor or TA for additional guidance: Prof. Smith (smith@umich.edu)</p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-[#94A3B8]">This study plan is personalized for you. No peer comparisons or rankings are shown.</p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
