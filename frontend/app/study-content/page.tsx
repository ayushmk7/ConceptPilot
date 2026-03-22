'use client';

import { useState, useEffect } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Headphones, Presentation, Video, Plus, Loader2 } from 'lucide-react';
import { AudioPlayer, SlideViewer, VideoWalkthroughPlayer, StudyContentCard } from '@/components/StudyContentPlayer';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { StudyContent } from '@/lib/types';
import * as api from '@/lib/api';
import { useExam } from '@/lib/exam-context';

export default function InstructorStudyContentPage() {
  const { selectedExamId, loading: examLoading } = useExam();
  const [content, setContent] = useState<StudyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<StudyContent | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExamId) return;
    loadContent();
  }, [selectedExamId]);

  const loadContent = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudyContent(selectedExamId);
      setContent(data);
    } catch {
      setError('Failed to load study content');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: 'audio' | 'slides' | 'video') => {
    if (!selectedExamId) return;
    setGenerating(type);
    try {
      const newContent = await api.generateStudyContent(selectedExamId, type);
      setContent((prev) => [...prev, newContent]);
    } catch {
      // handled silently
    } finally {
      setGenerating(null);
    }
  };

  if (examLoading || !selectedExamId) {
    return (
      <InstructorLayout>
        <PageLoader message={!selectedExamId ? 'Select a course and exam from the dashboard or upload wizard.' : 'Loading…'} />
      </InstructorLayout>
    );
  }

  if (loading) return <InstructorLayout><PageLoader message="Loading study content..." /></InstructorLayout>;
  if (error) return <InstructorLayout><ErrorState message={error} onRetry={loadContent} /></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Study content</h1>
            <p className="text-sm text-muted-foreground">
              Generate audio, slide decks, and video walkthroughs for this exam (runs asynchronously on the server).
            </p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {(['audio', 'slides', 'video'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleGenerate(type)}
                disabled={!!generating}
                className="card-elevated p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
              >
                {generating === type ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : type === 'audio' ? (
                  <Headphones className="w-6 h-6 text-chart-5" />
                ) : type === 'slides' ? (
                  <Presentation className="w-6 h-6 text-chart-3" />
                ) : (
                  <Video className="w-6 h-6 text-chart-4" />
                )}
                <div>
                  <div className="font-medium text-primary capitalize">New {type === 'slides' ? 'slides' : type}</div>
                  <div className="text-xs text-muted-foreground">Queue generation</div>
                </div>
                <Plus className="w-5 h-5 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.map((c) => (
              <StudyContentCard key={c.id} content={c} onOpen={() => setOpenContent(c)} />
            ))}
          </div>

          {content.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No study content yet — generate a bundle above.</p>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
}
