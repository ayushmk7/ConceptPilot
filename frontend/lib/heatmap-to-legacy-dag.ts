import type { LegacyConceptForDag } from '@/lib/types';

/** Midpoints of readiness buckets 0–20%, …, 80–100% (matches dashboard heatmap columns). */
const BUCKET_MID = [0.1, 0.3, 0.5, 0.7, 0.9];

export function heatmapRowsToLegacyConcepts(
  rows: Array<{ conceptId: string; name: string; readiness: number[] }>,
): LegacyConceptForDag[] {
  return rows.map((row) => {
    const counts = row.readiness;
    const total = counts.reduce((a, b) => a + b, 0);
    let readiness = 0.5;
    if (total > 0) {
      let weighted = 0;
      for (let i = 0; i < counts.length; i++) {
        weighted += BUCKET_MID[i] * (counts[i] / total);
      }
      readiness = weighted;
    }
    return {
      id: row.conceptId,
      name: row.name,
      readiness,
      depth: 0,
      prerequisites: [] as string[],
    };
  });
}
