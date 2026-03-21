'use client';

import { InstructorLayout } from '@/components/InstructorLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const waterfallData = [
  { name: 'Direct Readiness', value: 0.65, color: '#3B82F6' },
  { name: 'Prerequisite Penalty', value: -0.15, color: '#DC2626' },
  { name: 'Downstream Boost', value: 0.08, color: '#16A34A' },
  { name: 'Final Readiness', value: 0.58, color: '#00274C' },
];

const prerequisites = [
  { name: 'C++ Basics', readiness: 0.82, status: 'strong' },
  { name: 'Arrays', readiness: 0.75, status: 'strong' },
  { name: 'Memory Management', readiness: 0.42, status: 'weak' },
];

const dependents = [
  { name: 'Classes', readiness: 0.58 },
  { name: 'Inheritance', readiness: 0.45 },
  { name: 'Polymorphism', readiness: 0.38 },
];

const affectedStudents = [
  { id: '001', name: 'Student 001', readiness: 0.38 },
  { id: '002', name: 'Student 002', readiness: 0.42 },
  { id: '003', name: 'Student 003', readiness: 0.45 },
  { id: '004', name: 'Student 004', readiness: 0.52 },
  { id: '005', name: 'Student 005', readiness: 0.55 },
];

export default function RootCauseTrace() {
  const params = useParams();
  const conceptName = (params.concept as string) ? decodeURIComponent(params.concept as string) : 'Pointers';

  return (
    <InstructorLayout>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#4A5568] hover:text-[#00274C] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-[#00274C]">Root-Cause Trace: {conceptName}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#00274C]">Readiness Composition</h2>
              <select className="px-3 py-1.5 border border-[#CBD5E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00274C]">
                <option>Class Average</option>
                <option>Student 001</option>
                <option>Student 002</option>
                <option>Student 003</option>
              </select>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A5568' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4A5568' }} domain={[-0.2, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A2E',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="text-xs text-[#94A3B8] mb-1">Direct Readiness</div>
                <div className="text-2xl font-semibold text-[#3B82F6]">65%</div>
                <div className="text-xs text-[#4A5568] mt-1">From question performance</div>
              </div>
              <div className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="text-xs text-[#94A3B8] mb-1">Final Readiness</div>
                <div className="text-2xl font-semibold text-[#00274C]">58%</div>
                <div className="text-xs text-[#4A5568] mt-1">After adjustments</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[#00274C] mb-4">Upstream Prerequisites</h3>
              <div className="space-y-3">
                {prerequisites.map((prereq) => (
                  <div key={prereq.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[#CBD5E1]" />
                      <span className={`text-sm ${prereq.status === 'weak' ? 'text-[#DC2626] font-medium' : 'text-[#1A1A2E]'}`}>
                        {prereq.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${prereq.readiness * 100}%`,
                            backgroundColor: prereq.status === 'weak' ? '#DC2626' : '#16A34A',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#4A5568] w-8">{(prereq.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[#00274C] mb-4">Downstream Dependents</h3>
              <div className="space-y-3">
                {dependents.map((dep) => (
                  <div key={dep.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[#CBD5E1]" />
                      <span className="text-sm text-[#1A1A2E]">{dep.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F59E0B]"
                          style={{ width: `${dep.readiness * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#4A5568] w-8">{(dep.readiness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[#00274C] mb-4">Affected Students</h3>
              <div className="text-2xl font-semibold text-[#1A1A2E] mb-4">147</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {affectedStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-[#4A5568]">{student.name}</span>
                    <span className="text-[#DC2626] font-medium">{(student.readiness * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
