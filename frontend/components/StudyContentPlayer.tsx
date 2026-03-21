'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronLeft, ChevronRight, X, Maximize2, Minimize2,
  Headphones, Presentation, Video, Loader2,
} from 'lucide-react';
import type { StudyContent, SlideData } from '@/lib/types';
import * as api from '@/lib/api';

// ── Audio Player ──

export function AudioPlayer({ content, onClose }: { content: StudyContent; onClose?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [isMuted, setIsMuted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = content.duration
    ? content.duration.split(':').reduce((acc, v, i) => acc + parseInt(v) * (i === 0 ? 60 : 1), 0)
    : 600;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const newP = p + 100 / totalSeconds;
          const secs = Math.floor((newP / 100) * totalSeconds);
          setCurrentTime(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
          return newP;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, totalSeconds]);

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
            <Headphones className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#00274C]">{content.title}</h3>
            <p className="text-xs text-[#94A3B8]">{content.description}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-[#F1F5F9] rounded-lg">
            <X className="w-4 h-4 text-[#94A3B8]" />
          </button>
        )}
      </div>

      {/* Waveform-style visualization */}
      <div className="h-12 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] mb-3 flex items-center px-3 gap-0.5 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => {
          const height = 12 + Math.sin(i * 0.5) * 8 + Math.random() * 8;
          const filled = (i / 60) * 100 < progress;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors"
              style={{
                height: `${height}px`,
                backgroundColor: filled ? '#3B82F6' : '#E2E8F0',
              }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#4A5568] font-mono w-12">{currentTime}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setProgress(Math.max(0, progress - 10)); }}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <SkipBack className="w-4 h-4 text-[#4A5568]" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-[#00274C] hover:bg-[#1B365D] text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => { setProgress(Math.min(100, progress + 10)); }}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <SkipForward className="w-4 h-4 text-[#4A5568]" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#94A3B8]" /> : <Volume2 className="w-4 h-4 text-[#4A5568]" />}
          </button>
          <span className="text-xs text-[#94A3B8] font-mono w-12 text-right">{content.duration || '10:00'}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = ((e.clientX - rect.left) / rect.width) * 100;
          setProgress(p);
          const secs = Math.floor((p / 100) * totalSeconds);
          setCurrentTime(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
        }}>
          <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Slide Viewer ──

export function SlideViewer({ content, onClose }: { content: StudyContent; onClose?: () => void }) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    api.getSlideContent(content.id).then((data) => {
      setSlides(data);
      setLoading(false);
    });
  }, [content.id]);

  if (loading) {
    return (
      <div className="card-elevated p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#00274C] animate-spin" />
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className={`card-elevated overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-sm font-semibold text-[#00274C]">{content.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94A3B8]">
            {currentSlide + 1} / {slides.length}
          </span>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-[#E8EEF4] rounded-lg">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#4A5568]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#4A5568]" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-[#E8EEF4] rounded-lg">
              <X className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          )}
        </div>
      </div>

      {/* Slide content */}
      <div className={`bg-gradient-to-br from-[#00274C] to-[#1B365D] ${isFullscreen ? 'flex-1' : ''} p-8 md:p-12`}>
        <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">{slide?.title}</h2>
        <ul className="space-y-3">
          {slide?.content.map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-white/80 text-sm md:text-base">
              <div className="w-2 h-2 rounded-full bg-[#FFCB05] mt-2 flex-shrink-0" />
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
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0]">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="flex items-center gap-1.5 text-sm text-[#4A5568] hover:text-[#00274C] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-[#00274C]' : 'bg-[#E2E8F0]'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="flex items-center gap-1.5 text-sm text-[#4A5568] hover:text-[#00274C] disabled:opacity-40 disabled:cursor-not-allowed"
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = content.duration
    ? content.duration.split(':').reduce((acc, v, i) => acc + parseInt(v) * (i === 0 ? 60 : 1), 0)
    : 900;
  const slideInterval = totalSeconds / (slides.length || 1);

  useEffect(() => {
    api.getSlideContent(content.id).then((data) => {
      setSlides(data);
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
        <Loader2 className="w-6 h-6 text-[#00274C] animate-spin" />
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[#16A34A]" />
          <span className="text-sm font-semibold text-[#00274C]">{content.title}</span>
          <span className="text-xs text-[#94A3B8] ml-2">{content.duration}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-[#E8EEF4] rounded-lg">
            <X className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>
        )}
      </div>

      {/* Slide with narration indicator */}
      <div className="bg-gradient-to-br from-[#00274C] to-[#1B365D] p-8 relative">
        {isPlaying && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 bg-[#FFCB05] rounded-full animate-bounce" style={{ height: `${8 + Math.random() * 8}px`, animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <span className="text-xs text-white/70">Narrating</span>
          </div>
        )}
        <h2 className="text-xl font-semibold text-white mb-5">{slide?.title}</h2>
        <ul className="space-y-2.5">
          {slide?.content.map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#FFCB05] mt-1.5 flex-shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Controls */}
      <div className="px-5 py-3 border-t border-[#E2E8F0]">
        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-3 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = ((e.clientX - rect.left) / rect.width) * 100;
          setProgress(p);
          const elapsed = (p / 100) * totalSeconds;
          setCurrentSlide(Math.min(Math.floor(elapsed / slideInterval), slides.length - 1));
        }}>
          <div className="h-full bg-[#16A34A] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-full bg-[#00274C] hover:bg-[#1B365D] text-white flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="text-xs text-[#94A3B8]">Slide {currentSlide + 1} of {slides.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} className="p-1.5 hover:bg-[#F1F5F9] rounded-lg">
              <SkipBack className="w-4 h-4 text-[#4A5568]" />
            </button>
            <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} className="p-1.5 hover:bg-[#F1F5F9] rounded-lg">
              <SkipForward className="w-4 h-4 text-[#4A5568]" />
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
  const icons = { audio: Headphones, slides: Presentation, video: Video };
  const colors = { audio: '#3B82F6', slides: '#F59E0B', video: '#16A34A' };
  const bgs = { audio: '#EFF6FF', slides: '#FFF8E1', video: '#F0FDF4' };
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
          <h4 className="text-sm font-semibold text-[#00274C] mb-0.5">{content.title}</h4>
          <p className="text-xs text-[#94A3B8] line-clamp-2">{content.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#4A5568]">
            {content.duration && <span>{content.duration}</span>}
            {content.slideCount && <span>{content.slideCount} slides</span>}
            {content.status === 'generating' && (
              <span className="flex items-center gap-1 text-[#F59E0B]">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
