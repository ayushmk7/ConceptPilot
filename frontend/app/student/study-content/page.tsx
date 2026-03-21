'use client';

import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Headphones, Presentation, Video, Plus, Loader2 } from 'lucide-react';
import { AudioPlayer, SlideViewer, VideoWalkthroughPlayer, StudyContentCard } from '@/components/StudyContentPlayer';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { StudyContent } from '@/lib/types';
import * as api from '@/lib/api';

export default function StudyContentPage() {
  const [content, setContent] = useState<StudyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<StudyContent | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudyContent('e1');
      setContent(data);
    } catch {
      setError('Failed to load study content');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: 'audio' | 'slides' | 'video') => {
    setGenerating(type);
    try {
      const newContent = await api.generateStudyContent('e1', type);
      setContent((prev) => [...prev, newContent]);
    } catch {
      // handled silently
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <StudentLayout><PageLoader message="Loading study content..." /></StudentLayout>;
  if (error) return <StudentLayout><ErrorState message={error} onRetry={loadContent} /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-[#94A3B8]" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-[#00274C] mb-1">Study Content</h1>
            <p className="text-sm text-[#94A3B8]">
              Audio summaries, slide presentations, and video walkthroughs generated from your readiness data.
            </p>
          </div>

          {/* Player — show when content is opened */}
          {openContent && (
            <div className="mb-6 animate-fade-in-up">
              {openContent.type === 'audio' && (
                <AudioPlayer content={openContent} onClose={() => setOpenContent(null)} />
              )}
              {openContent.type === 'slides' && (
                <SlideViewer content={openContent} onClose={() => setOpenContent(null)} />
              )}
              {openContent.type === 'video' && (
                <VideoWalkthroughPlayer content={openContent} onClose={() => setOpenContent(null)} />
              )}
            </div>
          )}

          {/* Generate new content */}
          <div className="card-elevated p-5 mb-6 animate-fade-in-up delay-100">
            <h2 className="text-sm font-semibold text-[#00274C] mb-3">Generate New Content</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { type: 'audio' as const, label: 'Audio Summary', icon: Headphones, color: '#3B82F6', bg: '#EFF6FF', desc: 'AI-narrated concept review' },
                { type: 'slides' as const, label: 'Slide Deck', icon: Presentation, color: '#F59E0B', bg: '#FFF8E1', desc: 'Visual presentation' },
                { type: 'video' as const, label: 'Video Walkthrough', icon: Video, color: '#16A34A', bg: '#F0FDF4', desc: 'Narrated slides' },
              ]).map((item) => {
                const Icon = item.icon;
                const isGenerating = generating === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleGenerate(item.type)}
                    disabled={!!generating}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.bg }}>
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: item.color }} />
                      ) : (
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A2E]">{item.label}</div>
                      <div className="text-xs text-[#94A3B8]">{isGenerating ? 'Generating...' : item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content list */}
          <div className="animate-fade-in-up delay-200">
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Your Content</h2>
            {content.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <p className="text-sm text-[#4A5568]">No study content generated yet. Use the buttons above to create your first content.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.map((item) => (
                  <StudyContentCard key={item.id} content={item} onOpen={setOpenContent} />
                ))}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[#94A3B8]">
              Study content is personalized for your weak areas. No peer comparisons are included.
            </p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
