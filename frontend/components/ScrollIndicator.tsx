'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function ScrollIndicator({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      aria-label="Scroll to features"
      className={`mt-10 inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/30 text-white/60 hover:text-white hover:border-white/60 transition-all duration-300 animate-bounce ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <ChevronDown className="w-5 h-5" />
    </a>
  );
}
