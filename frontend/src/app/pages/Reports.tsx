import { InstructorLayout } from '../components/InstructorLayout';
import { Download, FileText, Users } from 'lucide-react';

export function Reports() {
  return (
    <InstructorLayout>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-[#00274C] mb-8">Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#00274C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#00274C] mb-2">Class Readiness Report</h3>
                <p className="text-sm text-[#4A5568] mb-4">
                  Comprehensive analytics on class-wide concept readiness with heatmaps and interventions.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00274C] text-white rounded-md hover:bg-[#1B365D] transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-[#00274C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#00274C] mb-2">Individual Student Reports</h3>
                <p className="text-sm text-[#4A5568] mb-4">
                  Generate personalized readiness reports with study plans for each student.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00274C] text-white rounded-md hover:bg-[#1B365D] transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Generate All</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#00274C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#00274C] mb-2">Intervention Plan</h3>
                <p className="text-sm text-[#4A5568] mb-4">
                  Detailed plan for addressing weak concepts with prioritized recommendations.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00274C] text-white rounded-md hover:bg-[#1B365D] transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#00274C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#00274C] mb-2">Data Export</h3>
                <p className="text-sm text-[#4A5568] mb-4">
                  Export raw readiness data, clusters, and analytics for further analysis.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00274C] text-white rounded-md hover:bg-[#1B365D] transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
