'use client';

import { useEffect, useState, useCallback } from 'react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Headphones, Presentation, Video, Mic, Plus, Loader2 } from 'lucide-react';
import { AudioPlayer, SlideViewer, VideoWalkthroughPlayer, StudyContentCard } from '@/components/StudyContentPlayer';
import { PageLoader } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorBoundary';
import type { StudyContent } from '@/lib/types';
import * as api from '@/lib/api';
import { useStudentBootstrap } from '@/lib/student-context';

type GenType = 'audio' | 'slides' | 'video' | 'podcast';

const LOCALES = [
  { value: '', label: 'Default (model)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
];

export default function StudentStudyContentPage() {
  const { examId, loading: bootLoading } = useStudentBootstrap();
  const [content, setContent] = useState<StudyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<StudyContent | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showOpts, setShowOpts] = useState(false);
  const [pendingType, setPendingType] = useState<GenType | null>(null);
  const [locale, setLocale] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [modelId, setModelId] = useState('');
  const [voices, setVoices] = useState<Array<{ voice_id: string; name: string; language?: string }>>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentStudyContent();
      setContent(data);
    } catch {
      setError('Failed to load study content');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!examId) return;
    void load();
  }, [examId, load]);

  useEffect(() => {
    if (!examId) return;
    if (!content.some((c) => c.status === 'generating')) return;
    let polls = 0;
    const id = setInterval(async () => {
      polls += 1;
      if (polls > 120) {
        clearInterval(id);
        return;
      }
      try {
        const data = await api.getStudentStudyContent();
        setContent(data);
        setOpenContent((prev) => {
          if (!prev) return null;
          return data.find((c) => c.id === prev.id) ?? prev;
        });
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [examId, content]);

  useEffect(() => {
    void api.listElevenLabsVoices().then(setVoices).catch(() => setVoices([]));
  }, []);

  const openGenerate = (type: GenType) => {
    setPendingType(type);
    setShowOpts(true);
  };

  const handleGenerate = async () => {
    if (!pendingType) return;
    const t = pendingType;
    setShowOpts(false);
    setGenerating(t);
    setGenError(null);
    try {
      const ct =
        t === 'slides' ? 'presentation' : t === 'video' ? 'video_walkthrough' : t === 'podcast' ? 'podcast' : 'audio';
      const newContent = await api.createStudentStudyContent({
        content_type: ct,
        title: `Generated ${t}`,
        focus_concepts: [],
        include_weak_concepts: true,
        locale,
        voice_id: voiceId,
        elevenlabs_model_id: modelId,
      });
      setContent((prev) => [...prev, newContent]);
    } catch (e) {
      setGenError(api.getFetchErrorMessage(e, 'Failed to queue generation'));
    } finally {
      setGenerating(null);
      setPendingType(null);
    }
  };

  if (bootLoading || !examId) {
    return (
      <StudentLayout>
        <PageLoader message="Loading workspace…" />
      </StudentLayout>
    );
  }

  if (loading) {
    return (
      <StudentLayout>
        <PageLoader message="Loading study content…" />
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <ErrorState message={error} onRetry={load} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Study content</h1>
            <p className="text-sm text-muted-foreground">
              Generate audio, slides, walkthroughs, and podcasts for the shared workspace. Choose voice and language before generating.
            </p>
            {genError && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {genError}
              </p>
            )}
          </div>

          {showOpts && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
                <h2 className="text-lg font-semibold text-primary">Generation options</h2>
                <p className="text-xs text-muted-foreground">
                  Applies to ElevenLabs narration (audio, video walkthrough, podcast). Leave blank to use server defaults.
                </p>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Language hint</span>
                  <select
                    className="mt-1 w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  >
                    {LOCALES.map((l) => (
                      <option key={l.value || 'default'} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Voice</span>
                  <select
                    className="mt-1 w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                  >
                    <option value="">Default voice</option>
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}
                        {v.language ? ` (${v.language})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">ElevenLabs model id (optional)</span>
                  <input
                    className="mt-1 w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background"
                    placeholder="eleven_multilingual_v2"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="px-3 py-1.5 text-sm rounded-lg border border-border" onClick={() => setShowOpts(false)}>
                    Cancel
                  </button>
                  <button type="button" className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white" onClick={() => void handleGenerate()}>
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {openContent && (
            <div className="mb-6 animate-fade-in-up">
              {(openContent.type === 'audio' || openContent.type === 'podcast') && (
                <AudioPlayer content={openContent} onClose={() => setOpenContent(null)} />
              )}
              {openContent.type === 'slides' && <SlideViewer content={openContent} onClose={() => setOpenContent(null)} />}
              {openContent.type === 'video' && (
                <VideoWalkthroughPlayer content={openContent} onClose={() => setOpenContent(null)} />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {(
              [
                ['audio', Headphones] as const,
                ['slides', Presentation] as const,
                ['video', Video] as const,
                ['podcast', Mic] as const,
              ] as const
            ).map(([type, Icon]) => (
              <button
                key={type}
                type="button"
                onClick={() => openGenerate(type)}
                disabled={!!generating}
                className="card-elevated p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
              >
                {generating === type ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Icon className="w-6 h-6 text-chart-5" />
                )}
                <div>
                  <div className="font-medium text-primary capitalize">New {type === 'slides' ? 'slides' : type}</div>
                  <div className="text-xs text-muted-foreground">Set options, then queue</div>
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
            <p className="text-sm text-muted-foreground text-center py-8">No study content yet — generate above after uploading exam data.</p>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
