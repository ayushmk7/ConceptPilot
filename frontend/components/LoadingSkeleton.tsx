'use client';

import { Loader2 } from 'lucide-react';

// ── Shimmer bar ──
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-gradient-to-r from-border via-muted to-border bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] ${className}`}
    />
  );
}

// ── Full-page spinner ──
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <p className="text-sm text-secondary-text">{message}</p>
      </div>
    </div>
  );
}

// ── Card skeleton ──
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card-elevated p-6 animate-fade-in">
      <Skeleton className="h-5 w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

// ── Stats row skeleton ──
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-elevated p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table skeleton ──
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="bg-muted/50 border-b border-border px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-muted flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Dashboard skeleton ──
export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <StatsRowSkeleton />
      <CardSkeleton lines={6} />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3"><CardSkeleton lines={4} /></div>
        <div className="md:col-span-2"><CardSkeleton lines={4} /></div>
      </div>
    </div>
  );
}

// ── Empty state ──
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center p-12 text-center">
      <div>
        {icon && <div className="mb-4 flex justify-center">{icon}</div>}
        <h3 className="text-base font-semibold text-primary mb-1">{title}</h3>
        {description && <p className="text-sm text-secondary-text mb-4 max-w-sm mx-auto">{description}</p>}
        {action}
      </div>
    </div>
  );
}
