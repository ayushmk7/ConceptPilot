'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Course, Exam } from './types';
import * as api from './api';
import { useAuth } from './auth-context';

const STORAGE_KEY = 'conceptpilot_exam_selection';

interface ExamContextValue {
  courses: Course[];
  exams: Exam[];
  selectedCourseId: string | null;
  selectedExamId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  setSelectedExamId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCourse: (name: string) => Promise<Course>;
  createExam: (name: string) => Promise<Exam>;
}

const ExamContext = createContext<ExamContextValue | null>(null);

function readSaved(): { courseId: string | null; examId: string | null } {
  if (typeof window === 'undefined') return { courseId: null, examId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { courseId: null, examId: null };
    const o = JSON.parse(raw) as { courseId?: string; examId?: string };
    return { courseId: o.courseId ?? null, examId: o.examId ?? null };
  } catch {
    return { courseId: null, examId: null };
  }
}

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken, isLoading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedCourseId, setSelectedCourseIdState] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((courseId: string | null, examId: string | null) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ courseId, examId }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cs = await api.getCourses();
      setCourses(cs);
      const saved = readSaved();
      const courseId =
        saved.courseId && cs.some((c) => c.id === saved.courseId) ? saved.courseId : cs[0]?.id ?? null;
      setSelectedCourseIdState(courseId);
      if (courseId) {
        const ex = await api.getExams(courseId);
        setExams(ex);
        const examId =
          saved.examId && ex.some((e) => e.id === saved.examId) ? saved.examId : ex[0]?.id ?? null;
        setSelectedExamIdState(examId);
        persist(courseId, examId);
      } else {
        setExams([]);
        setSelectedExamIdState(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    if (authLoading) return;
    if (authToken?.startsWith('student_token_')) {
      setLoading(false);
      setCourses([]);
      setExams([]);
      setSelectedCourseIdState(null);
      setSelectedExamIdState(null);
      return;
    }
    refresh();
  }, [authLoading, authToken, refresh]);

  useEffect(() => {
    if (!selectedCourseId) {
      setExams([]);
      setSelectedExamIdState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ex = await api.getExams(selectedCourseId);
        if (cancelled) return;
        setExams(ex);
        setSelectedExamIdState((prev) => {
          if (prev && ex.some((e) => e.id === prev)) return prev;
          const next = ex[0]?.id ?? null;
          persist(selectedCourseId, next);
          return next;
        });
      } catch {
        if (!cancelled) setExams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, persist]);

  const setSelectedCourseId = useCallback(
    (id: string | null) => {
      setSelectedCourseIdState(id);
      setSelectedExamIdState(null);
      persist(id, null);
    },
    [persist],
  );

  const setSelectedExamId = useCallback(
    (id: string | null) => {
      setSelectedExamIdState(id);
      if (selectedCourseId) persist(selectedCourseId, id);
    },
    [persist, selectedCourseId],
  );

  const createCourse = useCallback(
    async (name: string) => {
      const c = await api.createCourse(name);
      const cs = await api.getCourses();
      setCourses(cs);
      setSelectedCourseIdState(c.id);
      const ex = await api.getExams(c.id);
      setExams(ex);
      const firstExam = ex[0]?.id ?? null;
      setSelectedExamIdState(firstExam);
      persist(c.id, firstExam);
      return c;
    },
    [persist],
  );

  const createExam = useCallback(
    async (name: string) => {
      if (!selectedCourseId) throw new Error('Select a course first');
      const e = await api.createExam(selectedCourseId, name);
      const ex = await api.getExams(selectedCourseId);
      setExams(ex);
      setSelectedExamIdState(e.id);
      persist(selectedCourseId, e.id);
      return e;
    },
    [selectedCourseId, persist],
  );

  return (
    <ExamContext.Provider
      value={{
        courses,
        exams,
        selectedCourseId,
        selectedExamId,
        setSelectedCourseId,
        setSelectedExamId,
        loading,
        error,
        refresh,
        createCourse,
        createExam,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}
