'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface BlurFadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'top' | 'bottom';
  blur?: number;
}

export function BlurFadeIn({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  direction = 'bottom',
  blur = 12,
}: BlurFadeInProps) {
  const prefersReduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const yOffset = direction === 'top' ? -30 : 30;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={prefersReduced ? false : { filter: `blur(${blur}px)`, opacity: 0, y: yOffset }}
      animate={
        inView
          ? { filter: 'blur(0px)', opacity: 1, y: 0 }
          : { filter: `blur(${blur}px)`, opacity: 0, y: yOffset }
      }
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'transform, filter, opacity' }}
    >
      {children}
    </motion.div>
  );
}
