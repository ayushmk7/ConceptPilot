import type { ConceptGraphNode, ConceptGraphEdge } from '@/lib/types';

/** Shape expected by StudentConceptGraph (ClaudeIdeating ConceptNode). */
export interface StudentConceptGraphNode {
  id: string;
  name: string;
  readiness: number;
  depth: number;
  prerequisites: string[];
}

/**
 * Build prerequisite lists and depths from flat nodes + edges (prerequisite: source → target).
 */
export function graphNodesEdgesToStudentConcepts(
  nodes: Pick<ConceptGraphNode, 'id' | 'label'>[],
  edges: Pick<ConceptGraphEdge, 'source' | 'target'>[],
  readinessMap: Record<string, number>,
): StudentConceptGraphNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  const prereqs: Record<string, string[]> = {};
  for (const n of nodes) {
    prereqs[n.id] = [];
  }
  for (const e of edges) {
    if (!ids.has(e.target)) continue;
    if (!prereqs[e.target]) prereqs[e.target] = [];
    if (ids.has(e.source)) {
      prereqs[e.target].push(e.source);
    }
  }

  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function longestDepth(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const ps = prereqs[id] ?? [];
    let d = 0;
    for (const p of ps) {
      if (ids.has(p)) {
        d = Math.max(d, 1 + longestDepth(p));
      }
    }
    visiting.delete(id);
    memo.set(id, d);
    return d;
  }

  return nodes.map((n) => ({
    id: n.id,
    name: n.label,
    readiness: readinessMap[n.id] ?? 0,
    depth: longestDepth(n.id),
    prerequisites: prereqs[n.id] ?? [],
  }));
}
