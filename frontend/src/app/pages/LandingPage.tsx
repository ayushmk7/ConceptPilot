import { Link } from 'react-router';
import { BarChart3, Sparkles, FileText } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <nav className="h-14 bg-[#00274C] text-white flex items-center px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          PreReq
        </Link>
      </nav>

      <div className="bg-[#E8EEF4] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[2rem] font-semibold text-[#00274C] mb-4">
            Understand what your students are ready for.
          </h1>
          <p className="text-base text-[#4A5568] mb-8 max-w-2xl mx-auto">
            Upload exam data, map concepts, and get explainable readiness analytics powered by AI.
          </p>
          <Link
            to="/upload"
            className="inline-block px-6 py-3 bg-[#FFCB05] text-[#00274C] rounded-md font-medium hover:bg-[#FFCB05]/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-[#00274C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#00274C] mb-2">
              Concept Readiness
            </h3>
            <p className="text-sm text-[#4A5568]">
              Get detailed analytics on student readiness for each concept, with prerequisite dependencies and downstream impacts.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-[#00274C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#00274C] mb-2">
              AI-Assisted Setup
            </h3>
            <p className="text-sm text-[#4A5568]">
              Let AI help you map concepts, generate prerequisite graphs, and identify intervention opportunities.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-[#E8EEF4] flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-[#00274C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#00274C] mb-2">
              Student Reports
            </h3>
            <p className="text-sm text-[#4A5568]">
              Generate individualized, non-punitive reports with study plans ordered by prerequisite dependencies.
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t border-[#E2E8F0] py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm text-[#94A3B8]">
          <div className="flex gap-6 justify-center">
            <a href="#" className="hover:text-[#00274C] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#00274C] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
