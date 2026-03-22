'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import { Loader2, X } from 'lucide-react';
import type { GraphRetrieveEdge, GraphRetrieveNode, LegacyConceptForDag } from '@/lib/types';
import { expandConceptGraph, fetchGraphRetrieve } from '@/lib/api';

interface ConceptDAGProps {
  examId?: string | null;
  concepts?: LegacyConceptForDag[];
  onNodeClick?: (node: LegacyConceptForDag) => void;
  selectedNodeId?: string | null;
  /** When true, sit flush inside a parent card (no outer white card / heavy shadow). */
  embedded?: boolean;
  /** Shown on empty graph; defaults to instructor structure editor. */
  structureEditorHref?: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  readiness: number | null;
  isCsvObserved: boolean;
  depth: number;
  expanded: boolean;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
  weight: number;
}

interface ExpandedTopicsInfo {
  parentLabel: string;
  topics: Array<{ id: string; label: string }>;
}

const NODE_RADIUS = 28;

function readinessColor(r: number | null, observed: boolean): string {
  if (!observed || r === null) return '#B0BEC5';
  if (r >= 0.7) return '#FFCB05';
  if (r >= 0.5) return '#56B4E9';
  return '#D55E00';
}

export const ConceptDAG: React.FC<ConceptDAGProps> = ({
  examId,
  concepts: legacyConcepts,
  onNodeClick,
  selectedNodeId,
  embedded = false,
  structureEditorHref = '/graph-structure',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const [graphNodes, setGraphNodes] = useState<GraphRetrieveNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphRetrieveEdge[]>([]);
  const [expandingNode, setExpandingNode] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<ExpandedTopicsInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  const applyLegacy = useCallback((concepts: LegacyConceptForDag[]) => {
    const nodes: GraphRetrieveNode[] = concepts.map((c) => ({
      id: c.id,
      label: c.name,
      readiness: c.readiness,
      is_csv_observed: true,
      depth: c.depth,
    }));
    const edges: GraphRetrieveEdge[] = [];
    for (const c of concepts) {
      for (const pid of c.prerequisites) {
        edges.push({ source: pid, target: c.id, weight: 0.5 });
      }
    }
    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, []);

  useEffect(() => {
    if (!examId) {
      if (legacyConcepts && legacyConcepts.length > 0) {
        applyLegacy(legacyConcepts);
      } else {
        setGraphNodes([]);
        setGraphEdges([]);
      }
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    void fetchGraphRetrieve(examId)
      .then((resp) => {
        if (cancelled) return;
        if (resp.status === 'ok' && resp.nodes.length > 0) {
          setGraphNodes(resp.nodes);
          setGraphEdges(resp.edges);
        } else if (legacyConcepts && legacyConcepts.length > 0) {
          applyLegacy(legacyConcepts);
        } else {
          setGraphNodes([]);
          setGraphEdges([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (legacyConcepts && legacyConcepts.length > 0) {
          applyLegacy(legacyConcepts);
        } else {
          setGraphNodes([]);
          setGraphEdges([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [examId, legacyConcepts, applyLegacy]);

  const handleExpandNode = useCallback(
    async (nodeId: string) => {
      if (!examId || expandingNode) return;
      setExpandingNode(nodeId);
      try {
        const resp = await expandConceptGraph(examId, { concept_id: nodeId, max_depth: 3 });
        if (resp.status === 'ok') {
          let parentLabel = nodeId;
          setGraphNodes((prev) => {
            const parentNode = prev.find((n) => n.id === nodeId);
            parentLabel = parentNode?.label ?? nodeId;
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = resp.new_nodes.filter((n) => !existingIds.has(n.id));
            const updated = prev.map((n) => (n.id === nodeId ? { ...n } : n));
            return [...updated, ...newOnes];
          });
          setGraphEdges((prev) => {
            const existing = new Set(prev.map((e) => `${e.source}->${e.target}`));
            const newOnes = resp.new_edges.filter((e) => !existing.has(`${e.source}->${e.target}`));
            return [...prev, ...newOnes];
          });
          if (resp.new_nodes.length > 0) {
            setExpandedTopics({
              parentLabel,
              topics: resp.new_nodes.map((n) => ({ id: n.id, label: n.label })),
            });
          }
        }
      } catch {
        // AI expansion unavailable
      } finally {
        setExpandingNode(null);
      }
    },
    [examId, expandingNode],
  );

  const buildGraph = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (graphNodes.length === 0) {
      d3.select(container).selectAll('*').remove();
      simRef.current?.stop();
      simRef.current = null;
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(container).select('svg').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    svg.append('defs').append('marker')
      .attr('id', 'arrowhead').attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10).attr('refY', 0)
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#64748b');

    svg.select('defs').append('marker')
      .attr('id', 'arrowhead-active').attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10).attr('refY', 0)
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#FFCB05');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const expandedSet = new Set<string>();
    const nodes: SimNode[] = graphNodes.map((n) => ({
      id: n.id,
      label: n.label,
      readiness: n.readiness ?? null,
      isCsvObserved: n.is_csv_observed ?? true,
      depth: n.depth,
      expanded: expandedSet.has(n.id),
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: 80 + n.depth * 130 + (Math.random() - 0.5) * 40,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = graphEdges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, weight: e.weight }));

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(100).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('y', d3.forceY<SimNode>().y((d) => 80 + d.depth * 120).strength(0.4))
      .force('collision', d3.forceCollide(NODE_RADIUS + 18));

    simRef.current = simulation;

    const linkSel = g.append('g').attr('class', 'links').selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', (d) => {
        const src = typeof d.source === 'string' ? d.source : d.source.id;
        const tgt = typeof d.target === 'string' ? d.target : d.target.id;
        return selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId) ? '#FFCB05' : '#64748b';
      })
      .attr('stroke-width', (d) => {
        const src = typeof d.source === 'string' ? d.source : d.source.id;
        const tgt = typeof d.target === 'string' ? d.target : d.target.id;
        return selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId) ? 3 : 2;
      })
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', (d) => {
        const src = typeof d.source === 'string' ? d.source : d.source.id;
        const tgt = typeof d.target === 'string' ? d.target : d.target.id;
        return selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId)
          ? 'url(#arrowhead-active)' : 'url(#arrowhead)';
      });

    const nodeSel = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        if (onNodeClick) {
          const orig = legacyConcepts?.find((c) => c.id === d.id);
          if (orig) onNodeClick(orig);
        }
      })
      .on('dblclick', (_event, d) => {
        void handleExpandNode(d.id);
      })
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    nodeSel.append('circle')
      .attr('r', NODE_RADIUS + 5)
      .attr('fill', 'none')
      .attr('stroke', (d) => readinessColor(d.readiness, d.isCsvObserved))
      .attr('stroke-width', 2.5)
      .attr('opacity', (d) => (d.id === selectedNodeId ? 1 : 0));

    nodeSel.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', '#FFFFFF')
      .attr('stroke', (d) => readinessColor(d.readiness, d.isCsvObserved))
      .attr('stroke-width', 2.5);

    nodeSel.filter((d) => d.isCsvObserved && d.readiness !== null)
      .append('circle')
      .attr('r', (d) => NODE_RADIUS * (d.readiness ?? 0))
      .attr('fill', (d) => readinessColor(d.readiness, d.isCsvObserved))
      .attr('opacity', 0.15);

    nodeSel.filter((d) => d.isCsvObserved && d.readiness !== null)
      .append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', (d) => readinessColor(d.readiness, d.isCsvObserved))
      .attr('font-size', '12px').attr('font-weight', '600')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .text((d) => `${Math.round((d.readiness ?? 0) * 100)}%`);

    nodeSel.filter((d) => !d.isCsvObserved)
      .append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', '#9BA7B4')
      .attr('font-size', '10px').attr('font-weight', '500')
      .attr('font-family', 'system-ui')
      .text('...');

    nodeSel.append('text')
      .attr('text-anchor', 'middle').attr('dy', NODE_RADIUS + 16)
      .attr('fill', (d) => (d.isCsvObserved ? '#00274C' : '#78909C'))
      .attr('font-size', '11px').attr('font-weight', '500')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .text((d) => (d.label.length > 18 ? `${d.label.slice(0, 16)}...` : d.label));

    nodeSel.filter((d) => d.isCsvObserved && (d.readiness ?? 1) < 0.5)
      .select('circle:nth-child(2)')
      .each(function pulseLoop() {
        const el = d3.select(this);
        function pulse() {
          el.transition().duration(1000).attr('r', NODE_RADIUS + 3)
            .transition().duration(1000).attr('r', NODE_RADIUS).on('end', pulse);
        }
        pulse();
      });

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!);
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
  }, [graphNodes, graphEdges, onNodeClick, selectedNodeId, handleExpandNode, legacyConcepts]);

  useEffect(() => {
    buildGraph();
    return () => {
      simRef.current?.stop();
    };
  }, [buildGraph]);

  if (!loaded && examId) {
    return (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-lg bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loaded && examId && graphNodes.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 px-6 py-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          No concept graph for this exam yet. Upload a graph on the Upload step, or open the structure editor to add nodes and edges.
        </p>
        <Link
          href={structureEditorHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          Open structure editor
        </Link>
      </div>
    );
  }

  const canvasClass = embedded
    ? 'h-full w-full min-h-0 overflow-hidden rounded-lg bg-muted/20 ring-1 ring-inset ring-border/60'
    : 'h-full w-full min-h-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm';

  return (
    <div className="relative h-full w-full min-h-0">
      <div ref={containerRef} className={canvasClass} />
      {expandingNode && (
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm sm:left-auto sm:right-20 sm:max-w-none">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="truncate">Expanding {expandingNode}…</span>
        </div>
      )}
      {expandedTopics && (
        <div className="absolute left-3 top-12 z-30 max-h-[min(320px,50vh)] w-[min(calc(100%-1.5rem),260px)] overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-lg sm:left-auto sm:right-3 sm:top-3 sm:w-full sm:max-w-[260px]">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-primary">
              Subtopics of {expandedTopics.parentLabel}
            </h3>
            <button
              type="button"
              onClick={() => setExpandedTopics(null)}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close subtopics panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {expandedTopics.topics.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-xs text-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B0BEC5]" />
                {t.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 sm:right-24">
        <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-border/80 bg-white/90 px-2 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm sm:mx-0 sm:inline-flex sm:justify-start">
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="h-2 w-2 shrink-0 rounded-full bg-[#FFCB05]" /> High</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="h-2 w-2 shrink-0 rounded-full bg-[#56B4E9]" /> Medium</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="h-2 w-2 shrink-0 rounded-full bg-[#D55E00]" /> Low</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="h-2 w-2 shrink-0 rounded-full bg-[#B0BEC5]" /> AI-expanded</span>
          <span className="w-full text-center opacity-70 sm:ml-1 sm:w-auto sm:text-left">Double-click to expand</span>
        </div>
      </div>
    </div>
  );
};
