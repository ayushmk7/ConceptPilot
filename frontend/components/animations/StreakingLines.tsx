'use client';

import { motion, useReducedMotion } from 'motion/react';

/*
 * Each line is split into segments so different parts animate in at
 * different speeds / delays, giving a flowing, staggered feel.
 * All paths sweep from the left edge and converge toward the bottom-right.
 */

interface Segment {
  d: string;
  color: string;
  opacity: number;
  width: number;
  delay: number;
  duration: number;
}

const segments: Segment[] = [
  // --- Wave group 1 (fast, maize, top) ---
  { d: 'M-50,80 C120,40 280,130 480,100', color: 'var(--maize)', opacity: 0.35, width: 2.5, delay: 0, duration: 1.2 },
  { d: 'M480,100 C680,70 900,180 1120,200', color: 'var(--maize)', opacity: 0.3, width: 2.5, delay: 0.4, duration: 1.4 },
  { d: 'M1120,200 C1260,220 1380,340 1480,420', color: 'var(--maize)', opacity: 0.28, width: 2.5, delay: 0.9, duration: 1.0 },

  // --- Wave group 2 (medium, blue-tint) ---
  { d: 'M-30,160 C100,130 260,210 450,180', color: 'var(--blue-tint)', opacity: 0.3, width: 2, delay: 0.2, duration: 1.5 },
  { d: 'M450,180 C640,150 820,270 1020,260', color: 'var(--blue-tint)', opacity: 0.25, width: 2, delay: 0.7, duration: 1.6 },
  { d: 'M1020,260 C1200,250 1350,400 1480,500', color: 'var(--blue-tint)', opacity: 0.22, width: 2, delay: 1.3, duration: 1.2 },

  // --- Wave group 3 (maize, mid-section) ---
  { d: 'M-60,280 C80,240 230,340 420,300', color: 'var(--maize)', opacity: 0.28, width: 2, delay: 0.5, duration: 1.3 },
  { d: 'M420,300 C610,260 780,380 960,360', color: 'var(--maize)', opacity: 0.25, width: 2, delay: 1.0, duration: 1.5 },
  { d: 'M960,360 C1140,340 1320,470 1480,560', color: 'var(--maize)', opacity: 0.22, width: 2, delay: 1.6, duration: 1.1 },

  // --- Wave group 4 (slow, blue-tint, lower) ---
  { d: 'M-40,400 C140,360 310,440 500,420', color: 'var(--blue-tint)', opacity: 0.22, width: 1.8, delay: 0.8, duration: 1.8 },
  { d: 'M500,420 C690,400 870,500 1060,490', color: 'var(--blue-tint)', opacity: 0.2, width: 1.8, delay: 1.4, duration: 1.7 },
  { d: 'M1060,490 C1220,480 1380,580 1480,640', color: 'var(--blue-tint)', opacity: 0.18, width: 1.8, delay: 2.1, duration: 1.0 },

  // --- Wave group 5 (maize, bottom sweep) ---
  { d: 'M-70,500 C100,470 280,550 480,530', color: 'var(--maize)', opacity: 0.2, width: 1.5, delay: 1.0, duration: 1.6 },
  { d: 'M480,530 C680,510 860,590 1050,580', color: 'var(--maize)', opacity: 0.18, width: 1.5, delay: 1.7, duration: 1.5 },
  { d: 'M1050,580 C1200,570 1370,640 1480,690', color: 'var(--maize)', opacity: 0.16, width: 1.5, delay: 2.4, duration: 1.0 },

  // --- Wave group 6 (thin accent, fast) ---
  { d: 'M-20,220 C160,190 350,280 560,250', color: 'var(--maize)', opacity: 0.18, width: 1.2, delay: 0.3, duration: 1.1 },
  { d: 'M560,250 C770,220 940,330 1140,320', color: 'var(--maize)', opacity: 0.15, width: 1.2, delay: 0.8, duration: 1.3 },
  { d: 'M1140,320 C1280,310 1400,430 1480,520', color: 'var(--maize)', opacity: 0.14, width: 1.2, delay: 1.4, duration: 0.9 },

  // --- Wave group 7 (blue-tint, very top, fast) ---
  { d: 'M-80,40 C80,20 240,90 440,60', color: 'var(--blue-tint)', opacity: 0.16, width: 1, delay: 0.1, duration: 1.0 },
  { d: 'M440,60 C640,30 820,140 1040,130', color: 'var(--blue-tint)', opacity: 0.14, width: 1, delay: 0.5, duration: 1.2 },
  { d: 'M1040,130 C1200,120 1360,260 1480,350', color: 'var(--blue-tint)', opacity: 0.12, width: 1, delay: 1.0, duration: 0.8 },

  // --- Wave group 8 (bottom-most, slow drift) ---
  { d: 'M-50,600 C130,580 320,640 520,620', color: 'var(--blue-tint)', opacity: 0.15, width: 1, delay: 1.5, duration: 2.0 },
  { d: 'M520,620 C720,600 900,660 1100,650', color: 'var(--blue-tint)', opacity: 0.13, width: 1, delay: 2.2, duration: 1.8 },
  { d: 'M1100,650 C1250,640 1400,690 1480,700', color: 'var(--blue-tint)', opacity: 0.12, width: 1, delay: 3.0, duration: 1.0 },
];

export function StreakingLines({ className = '' }: { className?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 1440 700"
      preserveAspectRatio="none"
      fill="none"
    >
      {segments.map((seg, i) => (
        <motion.path
          key={i}
          d={seg.d}
          stroke={seg.color}
          strokeWidth={seg.width}
          strokeLinecap="round"
          opacity={seg.opacity}
          initial={prefersReduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: seg.duration,
            ease: 'easeOut',
            delay: seg.delay,
          }}
        />
      ))}
    </svg>
  );
}
