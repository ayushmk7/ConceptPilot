'use client';

import { InstructorLayout } from '@/components/InstructorLayout';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const mockConcepts = [
  { name: 'C++ Basics', readiness: [15, 22, 45, 88, 77] },
  { name: 'Pointers', readiness: [35, 52, 65, 55, 40] },
  { name: 'Arrays', readiness: [8, 18, 38, 92, 91] },
  { name: 'Structs', readiness: [12, 25, 55, 78, 77] },
  { name: 'Classes', readiness: [45, 58, 72, 42, 30] },
  { name: 'Dynamic Memory', readiness: [62, 68, 55, 35, 27] },
  { name: 'Inheritance', readiness: [58, 72, 65, 32, 20] },
  { name: 'Polymorphism', readiness: [68, 78, 52, 28, 21] },
];

const alerts = [
  { concept: 'Pointers', affected: 147, downstream: 8, severity: 0.85 },
  { concept: 'Dynamic Memory', affected: 123, downstream: 6, severity: 0.72 },
  { concept: 'Classes', affected: 98, downstream: 5, severity: 0.65 },
];

const interventions = [
  { rank: 1, concept: 'Pointers', description: 'Review pointer fundamentals and dereferencing', affected: 147 },
  { rank: 2, concept: 'Dynamic Memory', description: 'Focus on malloc/free patterns and memory safety', affected: 123 },
  { rank: 3, concept: 'Classes', description: 'Reinforce constructor/destructor concepts', affected: 98 },
];

const clusters = [
  { label: 'Cluster 1', count: 89, concepts: ['Pointers', 'Arrays', 'Classes', 'Basics', 'Structs'] },
  { label: 'Cluster 2', count: 82, concepts: ['Inheritance', 'Polymorphism', 'Classes', 'Dynamic Memory', 'Pointers'] },
  { label: 'Cluster 3', count: 76, concepts: ['Arrays', 'Basics', 'Structs', 'Pointers', 'Classes'] },
];

const readinessColors = ['#DC2626', '#F97316', '#F59E0B', '#22C55E', '#16A34A'];
const readinessLabels = ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'];

export default function Dashboard() {
  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[#00274C]">Readiness Analytics</h1>
          <div className="flex items-center gap-3">
            <select className="px-3 py-1.5 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]">
              <option>EECS 280</option>
              <option>EECS 281</option>
            </select>
            <select className="px-3 py-1.5 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]">
              <option>Midterm 1</option>
              <option>Midterm 2</option>
              <option>Final</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#00274C]">Readiness Heatmap</h2>
            <div className="flex items-center gap-2 text-xs">
              {readinessLabels.map((label, idx) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: readinessColors[idx] }} />
                  <span className="text-[#4A5568]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 px-3 text-sm font-medium text-[#4A5568]">Concept</th>
                  {readinessLabels.map((label) => (
                    <th key={label} className="text-center py-2 px-3 text-xs font-medium text-[#4A5568]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockConcepts.map((concept) => (
                  <tr key={concept.name} className="border-b border-[#E2E8F0] hover:bg-[#E8EEF4] transition-colors">
                    <td className="py-2 px-3">
                      <Link href={`/trace/${concept.name}`} className="text-sm font-medium text-[#00274C] hover:text-[#1B365D]">
                        {concept.name}
                      </Link>
                    </td>
                    {concept.readiness.map((count, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        <div
                          className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: readinessColors[idx] }}
                        >
                          {count}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="md:col-span-3 bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Foundational Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.concept} className="border border-[#E2E8F0] rounded-lg p-4 hover:border-[#00274C] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#DC2626] mt-0.5" />
                      <div>
                        <div className="font-medium text-[#1A1A2E]">{alert.concept}</div>
                        <div className="text-sm text-[#4A5568] mt-1">
                          <span className="font-medium text-[#1A1A2E]">{alert.affected}</span> students affected
                          {' • '}
                          {alert.downstream} downstream concepts
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#DC2626] rounded-full"
                        style={{ width: `${alert.severity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#00274C] mb-4">Recommended Interventions</h2>
            <div className="space-y-3">
              {interventions.map((item) => (
                <div key={item.rank} className="border border-[#E2E8F0] rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FFCB05] flex items-center justify-center text-[#00274C] text-xs font-medium flex-shrink-0">
                      {item.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#1A1A2E]">{item.concept}</div>
                      <div className="text-xs text-[#4A5568] mt-1">{item.description}</div>
                      <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-[#E8EEF4] rounded text-xs text-[#00274C]">
                        {item.affected} students
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Student Clusters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clusters.map((cluster, idx) => (
              <div key={cluster.label} className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-[#1A1A2E]">{cluster.label}</h3>
                  <span className="text-sm text-[#4A5568]">{cluster.count} students</span>
                </div>
                <div className="space-y-2">
                  {cluster.concepts.slice(0, 5).map((concept) => (
                    <div key={concept} className="flex items-center justify-between text-sm">
                      <span className="text-[#4A5568]">{concept}</span>
                      <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00274C] rounded-full"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#4A5568]">
                <span className="font-medium text-[#1A1A2E]">Parameters:</span>
                {' '}α=0.5, β=0.3, γ=0.2, threshold=0.6, k=3
              </div>
              <button className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium">
                Edit
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#4A5568]">
                <span className="font-medium text-[#1A1A2E]">Quick Actions:</span>
              </div>
              <div className="flex gap-2">
                <Link href="/student-report" className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium">
                  View Sample Report
                </Link>
                <span className="text-[#E2E8F0]">•</span>
                <Link href="/suggestions" className="text-sm text-[#00274C] hover:text-[#1B365D] font-medium">
                  AI Suggestions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
