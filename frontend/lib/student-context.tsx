'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from './api';
import { clearStudentWorkspace, readStudentWorkspace, writeStudentWorkspace } from './student-workspace-storage';

export type StudentBootstrap = {
  examId: string;
  courseId: string;
  courseName: string;
  examName: string;
  canvasProjectId: string;
  studyProjectId: string;
  sharedStudentId: string;
};

type StudentContextValue = StudentBootstrap & {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const defaultBoot: StudentBootstrap = {
  examId: '',
  courseId: '',
  courseName: '',
  examName: '',
  canvasProjectId: '',
  studyProjectId: '',
  sharedStudentId: '',
};

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boot, setBoot] = useState<StudentBootstrap>(defaultBoot);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = readStudentWorkspace();

      async function loadContext(withExamHeader: string | null) {
        const headers = new Headers();
        if (withExamHeader) {
          headers.set('X-Student-Exam-Id', withExamHeader);
        }
        return apiFetch<{
          exam_id: string;
          course_id: string;
          course_name: string;
          exam_name: string;
          canvas_project_id: string;
          study_project_id: string;
          shared_student_id: string;
        }>('/api/v1/student/context', {
          headers: headers.has('X-Student-Exam-Id') ? headers : undefined,
          skipStudentWorkspaceHeader: true,
        });
      }

      let r;
      try {
        r = await loadContext(stored?.examId ?? null);
      } catch (e) {
        const notFound =
          typeof e === 'object' &&
          e !== null &&
          'status' in e &&
          (e as { status: number }).status === 404;
        if (stored?.examId && notFound) {
          clearStudentWorkspace();
          r = await loadContext(null);
        } else {
          throw e;
        }
      }

      const next: StudentBootstrap = {
        examId: r.exam_id,
        courseId: r.course_id,
        courseName: r.course_name,
        examName: r.exam_name,
        canvasProjectId: r.canvas_project_id,
        studyProjectId: r.study_project_id,
        sharedStudentId: r.shared_student_id,
      };
      setBoot(next);
      writeStudentWorkspace({
        examId: next.examId,
        courseId: next.courseId,
        courseName: next.courseName,
        examName: next.examName,
        canvasProjectId: next.canvasProjectId,
        studyProjectId: next.studyProjectId,
        sharedStudentId: next.sharedStudentId,
      });
    } catch (e) {
      setBoot(defaultBoot);
      clearStudentWorkspace();
      setError(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: StudentContextValue = {
    ...boot,
    loading,
    error,
    refresh,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudentBootstrap(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error('useStudentBootstrap must be used within StudentProvider');
  }
  return ctx;
}

/** Returns null outside `StudentProvider` (e.g. instructor layout). */
export function useStudentBootstrapOptional(): StudentContextValue | null {
  return useContext(StudentContext);
}
