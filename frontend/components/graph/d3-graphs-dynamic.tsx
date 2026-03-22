'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const graphLoading = (
  <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-lg bg-muted/20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

/** D3 must not load on the server — avoids webpack/RSC "Cannot read properties of undefined (reading 'call')" failures. */
export const ConceptDAGDynamic = dynamic(
  () => import('./ConceptDAG').then((m) => ({ default: m.ConceptDAG })),
  { ssr: false, loading: () => graphLoading },
);

export const StudentConceptGraphDynamic = dynamic(
  () => import('./StudentConceptGraph').then((m) => ({ default: m.StudentConceptGraph })),
  { ssr: false, loading: () => graphLoading },
);
