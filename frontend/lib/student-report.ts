/** Cached student report from GET /api/v1/reports/{token} (no auth). */

import type { StudentReportResponse } from './api-types';

const TOKEN_KEY = 'student_report_token';
const CACHE_KEY = 'student_report_cache';

export function getStoredStudentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStudentSession(token: string, report: StudentReportResponse): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CACHE_KEY, JSON.stringify(report));
}

export function clearStudentSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CACHE_KEY);
}

export function getCachedStudentReport(): StudentReportResponse | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentReportResponse;
  } catch {
    return null;
  }
}
