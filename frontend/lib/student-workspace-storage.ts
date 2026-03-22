const KEY = 'conceptpilot_student_workspace';

export type StoredStudentWorkspace = {
  examId: string;
  courseId: string;
  courseName: string;
  examName: string;
  canvasProjectId: string;
  studyProjectId: string;
  sharedStudentId: string;
};

export function readStudentWorkspace(): StoredStudentWorkspace | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredStudentWorkspace>;
    if (!o.examId || typeof o.examId !== 'string') return null;
    return {
      examId: o.examId,
      courseId: o.courseId ?? '',
      courseName: o.courseName ?? '',
      examName: o.examName ?? '',
      canvasProjectId: o.canvasProjectId ?? '',
      studyProjectId: o.studyProjectId ?? '',
      sharedStudentId: o.sharedStudentId ?? '',
    };
  } catch {
    return null;
  }
}

export function writeStudentWorkspace(data: StoredStudentWorkspace): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearStudentWorkspace(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
