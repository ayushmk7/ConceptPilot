import type { ReportConfig } from './types';

/** Single export bundle option (aligned with backend `/api/v1/exams/{id}/export`). */
export function getReportConfigs(_examId: string): ReportConfig[] {
  return [
    {
      id: 'export_bundle',
      title: 'Canvas-ready export bundle',
      description: 'Readiness data, graph, clusters, and metadata for LMS import.',
      format: 'json',
      status: 'idle',
    },
  ];
}
