'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, X, Maximize2, Minimize2,
  Headphones, Presentation, Video, Mic, Loader2,
} from 'lucide-react';
import type { StudyContent, SlideData } from '@/lib/types';
import * as api from '@/lib/api';
import { themeColor } from '@/lib/theme-colors';

// ── Audio Player ──

export function AudioPlayer({ content, onClose }: { content: StudyContent; onClose?: () => void }) {
  const Icon = content.type === 'podcast' ? Mic : Headphones;
  const audioSrc = content.status === 'ready' ? api.getStudyContentDownloadUrl(content.id) : null;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">{content.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{content.description}</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {audioSrc ? (
        <audio key={audioSrc} controls className="w-full mt-1" preload="metadata" src={audioSrc} />
      ) : content.status === 'error' ? (
        <p className="text-sm text-destructive">
          Generation failed. You can try generating again from the list.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Still generating. This page refreshes the list automatically; open this item again when it is ready.
        </p>
      )}
    </div>
  );
}

// ── Slide Viewer ──

export function SlideViewer({ content, onClose }: { content: StudyContent; onClose?: () => void }) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    api
      .getSlideContent(content.id)
      .then((data) => {
        setSlides(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError('Could not load slides. Check that generation finished and try again.');
        setSlides([]);
        setLoading(false);
      });
  }, [content.id]);

  if (loading) {
    return (
      <div className="card-elevated p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">{content.title}</span>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-sm text-destructive">{fetchError}</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">{content.title}</span>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          No slide content yet. Wait until status is ready, then open again.
        </p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className={`card-elevated overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-chart-3" />
          <span className="text-sm font-semibold text-primary">{content.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-muted rounded-lg">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-secondary-text" /> : <Maximize2 className="w-3.5 h-3.5 text-secondary-text" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Slide content */}
      <div className={`bg-gradient-to-br from-primary to-chart-2 ${isFullscreen ? 'flex-1' : ''} p-8 md:p-12`}>
        <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">{slide?.title}</h2>
        <ul className="space-y-3">
          {(slide?.content ?? []).map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-white/80 text-sm md:text-base">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              {point}
            </li>
          ))}
        </ul>
        {slide?.notes && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 italic">{slide.notes}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="flex items-center gap-1.5 text-sm text-secondary-text hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="flex items-center gap-1.5 text-sm text-secondary-text hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Video Walkthrough Player ──

export function VideoWalkthroughPlayer({ content, onClose }: { content: StudyContent; onClose?: () => void }) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = content.duration
    ? content.duration.split(':').reduce((acc, v, i) => acc + parseInt(v) * (i === 0 ? 60 : 1), 0)
    : 900;
  const slideInterval = totalSeconds / (slides.length || 1);
  const narrationSrc = content.status === 'ready' ? api.getStudyContentDownloadUrl(content.id) : null;

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    api
      .getSlideContent(content.id)
      .then((data) => {
        setSlides(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError('Could not load walkthrough slides.');
        setSlides([]);
        setLoading(false);
      });
  }, [content.id]);

  useEffect(() => {
    if (isPlaying && slides.length > 0) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { setIsPlaying(false); return 100; }
          const newP = p + 100 / totalSeconds;
          const elapsed = (newP / 100) * totalSeconds;
          setCurrentSlide(Math.min(Math.floor(elapsed / slideInterval), slides.length - 1));
          return newP;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, totalSeconds, slideInterval, slides.length]);

  if (loading) {
    return (
      <div className="card-elevated p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">{content.title}</span>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-sm text-destructive">{fetchError}</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">{content.title}</span>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">No slides for this walkthrough yet.</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-chart-4" />
          <span className="text-sm font-semibold text-primary">{content.title}</span>
          <span className="text-xs text-muted-foreground ml-2">{content.duration}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {narrationSrc && (
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Narration (MP3)</p>
          <audio key={narrationSrc} controls className="w-full" preload="metadata" src={narrationSrc} />
        </div>
      )}

      {/* Slide with narration indicator */}
      <div className="bg-gradient-to-br from-primary to-chart-2 p-8 relative">
        {isPlaying && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 bg-accent rounded-full animate-bounce" style={{ height: `${8 + Math.random() * 8}px`, animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <span className="text-xs text-white/70">Narrating</span>
          </div>
        )}
        <h2 className="text-xl font-semibold text-white mb-5">{slide?.title}</h2>
        <ul className="space-y-2.5">
          {(slide?.content ?? []).map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
              <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Controls */}
      <div className="px-5 py-3 border-t border-border">
        <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = ((e.clientX - rect.left) / rect.width) * 100;
          setProgress(p);
          const elapsed = (p / 100) * totalSeconds;
          setCurrentSlide(Math.min(Math.floor(elapsed / slideInterval), slides.length - 1));
        }}>
          <div className="h-full bg-chart-4 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-full bg-primary hover:bg-chart-2 text-white flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="text-xs text-muted-foreground">Slide {currentSlide + 1} of {slides.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} className="p-1.5 hover:bg-muted rounded-lg">
              <SkipBack className="w-4 h-4 text-secondary-text" />
            </button>
            <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} className="p-1.5 hover:bg-muted rounded-lg">
              <SkipForward className="w-4 h-4 text-secondary-text" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Content type selector ──

export function StudyContentCard({
  content,
  onOpen,
}: {
  content: StudyContent;
  onOpen: (content: StudyContent) => void;
}) {
  const icons = { audio: Headphones, slides: Presentation, video: Video, podcast: Mic };
  const colors = {
    audio: themeColor.chart5,
    slides: themeColor.chart3,
    video: themeColor.chart4,
    podcast: themeColor.chart5,
  };
  const bgs = {
    audio: 'rgb(239 246 255)',
    slides: 'rgb(255 248 225)',
    video: 'rgb(240 253 244)',
    podcast: 'rgb(239 246 255)',
  };
  const Icon = icons[content.type];

  return (
    <button
      onClick={() => onOpen(content)}
      className="card-elevated p-5 text-left hover:shadow-md transition-all w-full"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgs[content.type] }}>
          <Icon className="w-5 h-5" style={{ color: colors[content.type] }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-primary mb-0.5">{content.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{content.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-secondary-text">
            {content.duration && <span>{content.duration}</span>}
            {content.slideCount && <span>{content.slideCount} slides</span>}
            {content.status === 'generating' && (
              <span className="flex items-center gap-1 text-chart-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
              </span>
            )}
            {content.status === 'error' && (
              <span className="text-destructive">Failed</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
