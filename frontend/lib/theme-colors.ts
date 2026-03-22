/**
 * CSS variable references aligned with `styles/theme.css`.
 * Use for Recharts, React Flow, inline SVG, and other JS-driven colors.
 */

export const themeColor = {
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  border: 'var(--border)',
  input: 'var(--input)',
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  mutedForeground: 'var(--muted-foreground)',
  secondaryText: 'var(--secondary-text)',
  destructive: 'var(--destructive)',
  chart4: 'var(--chart-4)',
  chart5: 'var(--chart-5)',
  chart3: 'var(--chart-3)',
  lightBlueWash: 'var(--light-blue-wash)',
  readiness0: 'var(--readiness-0)',
  readiness1: 'var(--readiness-1)',
  readiness2: 'var(--readiness-2)',
  readiness3: 'var(--readiness-3)',
  readiness4: 'var(--readiness-4)',
  white: '#ffffff',
  violet600: 'var(--violet-600)',
} as const;

export const readinessColorsJs = [
  themeColor.readiness0,
  themeColor.readiness1,
  themeColor.readiness2,
  themeColor.readiness3,
  themeColor.readiness4,
] as const;

export function readinessColorFromScore(readiness: number): string {
  if (readiness >= 0.8) return themeColor.readiness4;
  if (readiness >= 0.6) return themeColor.readiness3;
  if (readiness >= 0.4) return themeColor.readiness2;
  if (readiness >= 0.2) return themeColor.readiness1;
  return themeColor.readiness0;
}
