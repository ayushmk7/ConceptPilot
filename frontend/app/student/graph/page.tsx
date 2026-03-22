'use client';

import Link from 'next/link';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { GitBranch } from 'lucide-react';
import { ConceptDAGDynamic } from '@/components/graph/d3-graphs-dynamic';
import { useStudentBootstrap } from '@/lib/student-context';
import { Skeleton } from '@/components/LoadingSkeleton';

export default function StudentKnowledgeGraphPage() {
  const { examId, loading: bootLoading } = useStudentBootstrap();

  if (bootLoading || !examId) {
    return (
      <StudentLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Knowledge Graph</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Interactive concept dependencies for your exam workspace.
            </p>
          </div>
          <Link
            href="/student/graph-structure"
            className="btn-outline inline-flex shrink-0 items-center gap-2 self-start px-3 py-2 text-sm sm:self-auto"
          >
            <GitBranch className="h-4 w-4" />
            Edit nodes &amp; edges
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex min-h-[320px] h-[min(70vh,600px)] flex-col">
              <ConceptDAGDynamic examId={examId} embedded structureEditorHref="/student/graph-structure" />
            </div>
            <div className="text-xs text-muted-foreground text-center pt-2">
              Click a node for root-cause analysis. Double-click to expand with AI-suggested subtopics.
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
