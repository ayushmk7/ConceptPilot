import type { ConceptGraphEdge } from '@/lib/types';

/** Directed path from `from` to `to` using at least one edge (`from === to` is false for empty path). */
function hasDirectedPath(edges: ConceptGraphEdge[], from: string, to: string): boolean {
  if (from === to) return false;
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const w of adj.get(cur) ?? []) stack.push(w);
  }
  return false;
}

/**
 * Adding directed edge newSource -> newTarget would introduce a cycle iff
 * there is already a path newTarget -> ... -> newSource (or a self-edge on that node).
 */
export function wouldEdgeCreateCycle(
  edges: ConceptGraphEdge[],
  newSource: string,
  newTarget: string,
): boolean {
  if (newSource === newTarget) return true;
  return hasDirectedPath(edges, newTarget, newSource);
}

export function wouldReconnectCreateCycle(
  edges: ConceptGraphEdge[],
  oldSource: string,
  oldTarget: string,
  newSource: string,
  newTarget: string,
): boolean {
  if (newSource === oldSource && newTarget === oldTarget) return false;
  const next = edges.filter((e) => !(e.source === oldSource && e.target === oldTarget));
  return wouldEdgeCreateCycle(next, newSource, newTarget);
}
