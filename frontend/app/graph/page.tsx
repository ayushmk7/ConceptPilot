'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { GitBranch } from 'lucide-react';
import { ConceptDAGDynamic } from '@/components/graph/d3-graphs-dynamic';
import { useExam } from '@/lib/exam-context';
import type { LegacyConceptForDag } from '@/lib/types';
import * as api from '@/lib/api';
import { heatmapRowsToLegacyConcepts } from '@/lib/heatmap-to-legacy-dag';

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const { selectedExamId } = useExam();
  const [heatmapRows, setHeatmapRows] = useState<
    Array<{ conceptId: string; name: string; readiness: number[] }>
  >([]);

  useEffect(() => {
    if (!selectedExamId) {
      setHeatmapRows([]);
      return;
    }
    void api.getHeatmapData(selectedExamId).then(setHeatmapRows).catch(() => setHeatmapRows([]));
  }, [selectedExamId]);

  const legacyConcepts: LegacyConceptForDag[] | undefined = useMemo(() => {
    if (heatmapRows.length === 0) return undefined;
    return heatmapRowsToLegacyConcepts(heatmapRows);
  }, [heatmapRows]);

  return (
    <InstructorLayout>
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Knowledge Graph</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Interactive concept dependencies and readiness overlay for the selected exam.
            </p>
          </div>
          <Link
            href="/graph-structure"
            className="btn-outline inline-flex shrink-0 items-center gap-2 self-start px-3 py-2 text-sm sm:self-auto"
          >
            <GitBranch className="h-4 w-4" />
            Edit nodes &amp; edges
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex min-h-[320px] h-[min(70vh,600px)] flex-col">
              {!selectedExamId ? (
                <p className="text-sm text-muted-foreground">Select a course and exam from the sidebar.</p>
              ) : (
                <ConceptDAGDynamic
                  examId={selectedExamId}
                  concepts={legacyConcepts}
                  embedded
                  selectedNodeId={null}
                  onNodeClick={(node) => {
                    router.push(`/trace/${encodeURIComponent(node.id)}`);
                  }}
                />
              )}
            </div>
            <div className="text-xs text-muted-foreground text-center pt-2">
              Click a node for root-cause analysis. Double-click to expand with AI-suggested subtopics.
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
