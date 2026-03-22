'use client';

import { motion, useReducedMotion } from 'motion/react';

/*
 * Streaking lines animation — "speed ramp pack" style:
 *
 * 1. ~25 evenly-spaced base curves sweep from off-screen left to
 *    the bottom-right corner.
 * 2. Each curve renders 3 path elements: a LEADER and 2 FOLLOWERS.
 *    The leader arrives first (shorter delay), followers trail behind
 *    with staggered delays — creating a "pack" that moves together.
 * 3. Easing is "speed ramp": fast start → slow finish [0.12, 0.8, 0.3, 1].
 * 4. All strokes use the same constant width (1.5) for uniformity.
 * 5. Loops infinitely with yoyo.
 */

interface BaseCurve {
  d: string;
  color: string;
  baseOpacity: number;
  delay: number;
  duration: number;
}

// Generate evenly-spaced curves from y=0 to y=660, every ~27px
// All start well off-screen (x = -300) and end at bottom-right (1540, 680-720)
const baseCurves: BaseCurve[] = [
  { d: 'M-300,0 C0,-40 400,40 750,80 S1200,270 1540,640', color: 'var(--maize)', baseOpacity: 0.35, delay: 0, duration: 10.0 },
  { d: 'M-300,27 C0,-10 400,70 750,110 S1200,290 1540,650', color: 'var(--blue-tint)', baseOpacity: 0.28, delay: 0.5, duration: 10.5 },
  { d: 'M-300,54 C0,15 400,100 750,140 S1200,310 1540,660', color: 'var(--maize)', baseOpacity: 0.32, delay: 1.1, duration: 10.0 },
  { d: 'M-300,81 C0,40 400,130 750,170 S1200,335 1540,665', color: 'var(--blue-tint)', baseOpacity: 0.26, delay: 1.7, duration: 11.0 },
  { d: 'M-300,108 C0,65 400,155 750,195 S1200,355 1540,670', color: 'var(--maize)', baseOpacity: 0.30, delay: 0.3, duration: 10.0 },
  { d: 'M-300,135 C0,90 400,180 750,220 S1200,375 1540,675', color: 'var(--blue-tint)', baseOpacity: 0.24, delay: 2.2, duration: 11.2 },
  { d: 'M-300,162 C0,115 400,205 750,245 S1200,395 1540,680', color: 'var(--maize)', baseOpacity: 0.28, delay: 0.8, duration: 10.2 },
  { d: 'M-300,189 C0,142 400,232 750,272 S1200,415 1540,685', color: 'var(--blue-tint)', baseOpacity: 0.22, delay: 2.8, duration: 11.5 },
  { d: 'M-300,216 C0,168 400,258 750,298 S1200,435 1540,688', color: 'var(--maize)', baseOpacity: 0.26, delay: 1.4, duration: 10.5 },
  { d: 'M-300,243 C0,195 400,285 750,325 S1200,458 1540,690', color: 'var(--blue-tint)', baseOpacity: 0.20, delay: 3.4, duration: 12.0 },
  { d: 'M-300,270 C0,222 400,312 750,352 S1200,478 1540,692', color: 'var(--maize)', baseOpacity: 0.24, delay: 0.5, duration: 10.0 },
  { d: 'M-300,297 C0,248 400,338 750,378 S1200,498 1540,695', color: 'var(--blue-tint)', baseOpacity: 0.18, delay: 3.9, duration: 12.3 },
  { d: 'M-300,324 C0,275 400,365 750,405 S1200,518 1540,697', color: 'var(--maize)', baseOpacity: 0.22, delay: 2.0, duration: 11.0 },
  { d: 'M-300,351 C0,302 400,392 750,432 S1200,538 1540,698', color: 'var(--blue-tint)', baseOpacity: 0.16, delay: 4.5, duration: 12.6 },
  { d: 'M-300,378 C0,328 400,418 750,458 S1200,558 1540,700', color: 'var(--maize)', baseOpacity: 0.20, delay: 1.1, duration: 10.5 },
  { d: 'M-300,405 C0,355 400,445 750,485 S1200,578 1540,702', color: 'var(--blue-tint)', baseOpacity: 0.15, delay: 5.0, duration: 13.0 },
  { d: 'M-300,432 C0,382 400,472 750,512 S1200,598 1540,704', color: 'var(--maize)', baseOpacity: 0.18, delay: 2.5, duration: 11.2 },
  { d: 'M-300,459 C0,408 400,498 750,538 S1200,615 1540,706', color: 'var(--blue-tint)', baseOpacity: 0.14, delay: 5.6, duration: 13.3 },
  { d: 'M-300,486 C0,435 400,525 750,565 S1200,632 1540,708', color: 'var(--maize)', baseOpacity: 0.16, delay: 3.1, duration: 12.0 },
  { d: 'M-300,513 C0,462 400,552 750,592 S1200,648 1540,710', color: 'var(--blue-tint)', baseOpacity: 0.12, delay: 6.2, duration: 13.7 },
  { d: 'M-300,540 C0,488 400,578 750,618 S1200,662 1540,712', color: 'var(--maize)', baseOpacity: 0.14, delay: 3.6, duration: 12.3 },
  { d: 'M-300,567 C0,515 400,605 750,640 S1200,675 1540,714', color: 'var(--blue-tint)', baseOpacity: 0.10, delay: 6.7, duration: 14.0 },
  { d: 'M-300,594 C0,542 400,632 750,660 S1200,688 1540,716', color: 'var(--maize)', baseOpacity: 0.12, delay: 4.2, duration: 12.6 },
  { d: 'M-300,621 C0,568 400,658 750,680 S1200,698 1540,718', color: 'var(--blue-tint)', baseOpacity: 0.08, delay: 7.3, duration: 14.7 },
  { d: 'M-300,648 C0,595 400,680 750,695 S1200,708 1540,720', color: 'var(--maize)', baseOpacity: 0.10, delay: 4.8, duration: 13.3 },
];

// Each curve spawns a leader + 2 followers for the "pack" trailing effect
const STROKE_WIDTH = 2.5;
const PATH_ESTIMATE = 1900;
const LEADER_DASH = '120 1800';      // long visible segment
const FOLLOWER1_DASH = '70 1800';    // shorter, trails behind
const FOLLOWER2_DASH = '35 1800';    // shortest, furthest back

// Speed ramp easing: moderate start → long gentle slow-down (no harsh burst)
const SPEED_RAMP: [number, number, number, number] = [0.25, 0.6, 0.35, 1];

interface RenderedPath {
  d: string;
  color: string;
  opacity: number;
  dashPattern: string;
  delay: number;
  duration: number;
}

const renderedPaths: RenderedPath[] = baseCurves.flatMap((curve) => [
  // Leader — arrives first, longest dash
  {
    d: curve.d,
    color: curve.color,
    opacity: curve.baseOpacity,
    dashPattern: LEADER_DASH,
    delay: curve.delay,
    duration: curve.duration,
  },
  // Follower 1 — slightly behind, medium dash, lower opacity
  {
    d: curve.d,
    color: curve.color,
    opacity: curve.baseOpacity * 0.55,
    dashPattern: FOLLOWER1_DASH,
    delay: curve.delay + 0.25,
    duration: curve.duration * 1.05,
  },
  // Follower 2 — furthest back, short dash, faintest
  {
    d: curve.d,
    color: curve.color,
    opacity: curve.baseOpacity * 0.3,
    dashPattern: FOLLOWER2_DASH,
    delay: curve.delay + 0.5,
    duration: curve.duration * 1.1,
  },
]);

export function StreakingLines({ className = '' }: { className?: string }) {
  const prefersReduced = useReducedMotion();
  const offsetStart = PATH_ESTIMATE + 200;

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="-300 -40 1840 780"
      preserveAspectRatio="none"
      fill="none"
    >
      {renderedPaths.map((p, i) => (
        <motion.path
          key={i}
          d={p.d}
          stroke={p.color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          opacity={p.opacity}
          strokeDasharray={p.dashPattern}
          initial={prefersReduced ? false : { strokeDashoffset: offsetStart }}
          animate={{ strokeDashoffset: -offsetStart }}
          transition={{
            duration: p.duration,
            ease: SPEED_RAMP,
            delay: p.delay,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </svg>
  );
}
