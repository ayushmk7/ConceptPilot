'use client';

import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { Headphones } from 'lucide-react';

export default function StudentStudyContentPage() {
  return (
    <StudentLayout>
      <div className="relative max-w-2xl mx-auto px-6 py-12">
        <DotPattern className="text-muted-foreground" />
        <div className="relative text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Headphones className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-primary">Study content</h1>
          <p className="text-secondary-text text-sm leading-relaxed">
            Generated audio, slides, and walkthroughs are created by your instructor in ConceptPilot. Student downloads
            from this app are not available yet — your instructor can share files or links through your course.
          </p>
        </div>
      </div>
    </StudentLayout>
  );
}
