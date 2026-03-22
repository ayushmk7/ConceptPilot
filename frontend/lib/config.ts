/**
 * Centralized public env and tunable defaults for the Next.js app.
 * Server and client: `NEXT_PUBLIC_*` is inlined at build time.
 */

const DEFAULT_API_BASE = 'http://127.0.0.1:8000';

function resolveApiBase(): string {
  const v = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (v) return v.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_API_BASE;
  }
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      'NEXT_PUBLIC_API_URL is unset; using default %s. Set NEXT_PUBLIC_API_URL for deployed environments.',
      DEFAULT_API_BASE,
    );
  }
  return DEFAULT_API_BASE;
}

export const API_BASE = resolveApiBase();

/** Milliseconds between compute-run status polls. */
export const COMPUTE_POLL_INTERVAL_MS = Math.max(
  500,
  Number(process.env.NEXT_PUBLIC_COMPUTE_POLL_INTERVAL_MS ?? 2000) || 2000,
);

/** Max poll attempts before compute is treated as timed out (client-side). */
export const COMPUTE_POLL_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_COMPUTE_POLL_MAX_ATTEMPTS ?? 60) || 60,
);

