'use client';

import { useEffect, useRef } from 'react';

const dots = [
  { x: 10, y: 20 }, { x: 25, y: 60 }, { x: 40, y: 15 }, { x: 55, y: 45 },
  { x: 70, y: 20 }, { x: 85, y: 55 }, { x: 15, y: 80 }, { x: 45, y: 75 },
  { x: 75, y: 80 }, { x: 90, y: 35 }, { x: 30, y: 40 }, { x: 60, y: 65 },
  { x: 50, y: 30 }, { x: 20, y: 45 }, { x: 80, y: 45 },
];

const lines = [
  [0, 2], [2, 4], [4, 9], [1, 3], [3, 5], [6, 7], [7, 8], [0, 13],
  [13, 10], [10, 12], [12, 3], [3, 11], [11, 8], [5, 14], [14, 9],
  [1, 6], [4, 14],
];

export function HeroNetwork({ className = '' }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !svgRef.current) return;

    const circles = svgRef.current.querySelectorAll<SVGCircleElement>('circle[data-float]');
    circles.forEach((circle, i) => {
      circle.style.animation = `float ${3 + (i % 3)}s ease-in-out ${(i * 0.4) % 2}s infinite`;
    });
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    >
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={dots[a].x}
          y1={dots[a].y}
          x2={dots[b].x}
          y2={dots[b].y}
          stroke="white"
          strokeWidth="0.15"
          opacity="0.15"
        />
      ))}
      {dots.map((d, i) => (
        <circle
          key={i}
          data-float=""
          cx={d.x}
          cy={d.y}
          r="0.6"
          fill="white"
          opacity="0.3"
        />
      ))}
    </svg>
  );
}
