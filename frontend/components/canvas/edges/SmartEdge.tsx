'use client';

import {
  BaseEdge,
  Position,
  useNodes,
  type EdgeProps,
  type Node,
} from '@xyflow/react';
import { themeColor } from '@/lib/theme-colors';

/* ─── Types ─── */

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type Pt = [number, number];

/* ─── Constants ─── */

/** Padding inflated around each obstacle node's bounding box */
const PAD = 24;

/* ─── Geometry helpers ─── */

/** Build an inflated bounding rect for a node (already includes PAD). */
function nodeRect(n: Node): Rect {
  const w = Number(
    n.measured?.width ?? n.width ?? (n.style as Record<string, unknown>)?.width ?? 200,
  );
  const h = Number(
    n.measured?.height ?? n.height ?? (n.style as Record<string, unknown>)?.height ?? 100,
  );
  return {
    left: n.position.x - PAD,
    right: n.position.x + w + PAD,
    top: n.position.y - PAD,
    bottom: n.position.y + h + PAD,
  };
}

/** Does a horizontal segment at `y` spanning `x1→x2` cross any rect? */
function hBlocked(y: number, x1: number, x2: number, rects: Rect[]): boolean {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  return rects.some(
    (r) => y > r.top && y < r.bottom && hi > r.left && lo < r.right,
  );
}

/** Does a vertical segment at `x` spanning `y1→y2` cross any rect? */
function vBlocked(x: number, y1: number, y2: number, rects: Rect[]): boolean {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  return rects.some(
    (r) => x > r.left && x < r.right && hi > r.top && lo < r.bottom,
  );
}

/** Is a single axis-aligned segment blocked? */
function segBlocked(a: Pt, b: Pt, rects: Rect[]): boolean {
  // Horizontal
  if (a[1] === b[1]) return hBlocked(a[1], a[0], b[0], rects);
  // Vertical
  if (a[0] === b[0]) return vBlocked(a[0], a[1], b[1], rects);
  // Diagonal (shouldn't happen) – treat as blocked
  return true;
}

/** Is every segment of a waypoint path free of obstacles? */
function pathClear(pts: Pt[], rects: Rect[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    if (segBlocked(pts[i], pts[i + 1], rects)) return false;
  }
  return true;
}

/** Remove consecutive duplicate waypoints (zero-length segments). */
function dedup(pts: Pt[]): Pt[] {
  return pts.filter(
    (p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1],
  );
}

/** Step outward from a handle in its facing direction. */
function extend(x: number, y: number, pos: Position, gap: number): Pt {
  switch (pos) {
    case Position.Right:
      return [x + gap, y];
    case Position.Left:
      return [x - gap, y];
    case Position.Bottom:
      return [x, y + gap];
    case Position.Top:
      return [x, y - gap];
  }
}

/** Convert a waypoint array to an SVG path string. */
function toSvg(pts: Pt[]): string {
  const clean = dedup(pts);
  return clean.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

/* ─── Main pathfinder ─── */

/**
 * Builds an orthogonal SVG path from source handle → target handle
 * that avoids every obstacle rect.
 *
 * Strategy: try several candidate routes (from simplest to widest detour)
 * and pick the first one whose every segment is free of obstacles.
 */
function findPath(
  sx: number,
  sy: number,
  sp: Position,
  tx: number,
  ty: number,
  tp: Position,
  obstacles: Rect[],
): string {
  const GAP = PAD + 4;
  const src: Pt = [sx, sy];
  const tgt: Pt = [tx, ty];
  const extS = extend(sx, sy, sp, GAP);
  const extT = extend(tx, ty, tp, GAP);

  const [ex, ey] = extS;
  const [fx, fy] = extT;

  // ── No obstacles → simple Z-path ──
  if (obstacles.length === 0) {
    const mx = (ex + fx) / 2;
    return toSvg([src, extS, [mx, ey], [mx, fy], extT, tgt]);
  }

  // ── Precompute extremes for detour routes ──
  const tops = obstacles.map((r) => r.top);
  const bots = obstacles.map((r) => r.bottom);
  const lefts = obstacles.map((r) => r.left);
  const rights = obstacles.map((r) => r.right);

  const allTop = Math.min(ey, fy, ...tops) - PAD;
  const allBot = Math.max(ey, fy, ...bots) + PAD;
  const allLeft = Math.min(ex, fx, ...lefts) - PAD;
  const allRight = Math.max(ex, fx, ...rights) + PAD;
  const midX = (ex + fx) / 2;
  const midY = (ey + fy) / 2;

  // ── Candidate routes, simplest first ──
  const candidates: Pt[][] = [
    // L-shape option A: H then V
    [src, extS, [fx, ey], extT, tgt],
    // L-shape option B: V then H
    [src, extS, [ex, fy], extT, tgt],
    // Z-shape H-V-H through midpoint X
    [src, extS, [midX, ey], [midX, fy], extT, tgt],
    // Z-shape V-H-V through midpoint Y
    [src, extS, [ex, midY], [fx, midY], extT, tgt],
    // Detour above all obstacles
    [src, extS, [ex, allTop], [fx, allTop], extT, tgt],
    // Detour below all obstacles
    [src, extS, [ex, allBot], [fx, allBot], extT, tgt],
    // Detour left of all obstacles
    [src, extS, [allLeft, ey], [allLeft, fy], extT, tgt],
    // Detour right of all obstacles
    [src, extS, [allRight, ey], [allRight, fy], extT, tgt],
  ];

  for (const raw of candidates) {
    const clean = dedup(raw);
    if (pathClear(clean, obstacles)) {
      return toSvg(clean);
    }
  }

  // ── Guaranteed fallback: far above everything ──
  const safeY = allTop - PAD * 2;
  return toSvg(dedup([src, extS, [ex, safeY], [fx, safeY], extT, tgt]));
}

/* ─── Component ─── */

export function SmartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  style,
  markerEnd,
}: EdgeProps) {
  const allNodes = useNodes();

  // Every node except source & target is an obstacle
  const obstacles = allNodes
    .filter((n) => n.id !== source && n.id !== target)
    .map(nodeRect);

  const path = findPath(
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    obstacles,
  );

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        ...style,
        stroke: style?.stroke ?? themeColor.mutedForeground,
        strokeWidth: (style?.strokeWidth as number) ?? 2,
      }}
      markerEnd={markerEnd}
    />
  );
}
