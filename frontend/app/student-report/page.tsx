'use client';

import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const conceptNodes = [
  { id: '1', position: { x: 100, y: 50 }, data: { label: 'C++ Basics', readiness: 0.85 } },
  { id: '2', position: { x: 300, y: 50 }, data: { label: 'Arrays', readiness: 0.78 } },
  { id: '3', position: { x: 100, y: 150 }, data: { label: 'Pointers', readiness: 0.45 } },
  { id: '4', position: { x: 300, y: 150 }, data: { label: 'Classes', readiness: 0.52 } },
  { id: '5', position: { x: 200, y: 250 }, data: { label: 'Inheritance', readiness: 0.38 } },
];

const conceptEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
  { id: 'e2-4', source: '2', target: '4', type: 'smoothstep' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep' },
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep' },
];

const getReadinessColor = (readiness: number) => {
  if (readiness >= 0.8) return '#16A34A';
  if (readiness >= 0.6) return '#22C55E';
  if (readiness >= 0.4) return '#F59E0B';
  if (readiness >= 0.2) return '#F97316';
  return '#DC2626';
};

const weakConcepts = [
  { name: 'Inheritance', readiness: 0.38, confidence: 'medium' },
  { name: 'Pointers', readiness: 0.45, confidence: 'high' },
  { name: 'Classes', readiness: 0.52, confidence: 'high' },
];

const studyPlan = [
  { step: 1, concept: 'Pointers', readiness: 0.45, reason: 'Foundational for understanding dynamic memory and classes' },
  { step: 2, concept: 'Classes', readiness: 0.52, reason: 'Builds on pointers and enables inheritance concepts' },
  { step: 3, concept: 'Inheritance', readiness: 0.38, reason: 'Depends on strong understanding of classes' },
];

export default function StudentReport() {
  const nodes = conceptNodes.map((node) => ({
    ...node,
    type: 'default' as const,
    style: {
      background: getReadinessColor(node.data.readiness),
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: 500,
    },
  }));

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-semibold text-[#00274C] mb-2">Your Readiness Report</h1>
          <p className="text-sm text-[#4A5568]">EECS 280 Midterm 1 • Student ID: 12345678</p>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Concept Map</h2>
          <div className="h-80 bg-[#FAFBFC] rounded border border-[#E2E8F0]">
            <ReactFlow
              nodes={nodes}
              edges={conceptEdges}
              fitView
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { stroke: '#CBD5E1', strokeWidth: 2 },
              }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
            >
              <Background gap={20} size={1} color="#E2E8F0" />
            </ReactFlow>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DC2626' }} />
              <span className="text-[#4A5568]">0-0.2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F97316' }} />
              <span className="text-[#4A5568]">0.2-0.4</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-[#4A5568]">0.4-0.6</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22C55E' }} />
              <span className="text-[#4A5568]">0.6-0.8</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#16A34A' }} />
              <span className="text-[#4A5568]">0.8-1.0</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Readiness Breakdown</h2>
          <div className="space-y-3">
            {conceptNodes
              .sort((a, b) => a.data.readiness - b.data.readiness)
              .map((concept) => (
                <div key={concept.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                  <span className="font-medium text-[#1A1A2E]">{concept.data.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${concept.data.readiness * 100}%`,
                          backgroundColor: getReadinessColor(concept.data.readiness),
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#1A1A2E] w-12 text-right">
                      {(concept.data.readiness * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Areas for Focus</h2>
          <div className="space-y-3">
            {weakConcepts.map((concept) => (
              <div key={concept.name} className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-[#1A1A2E]">{concept.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: getReadinessColor(concept.readiness) }}>
                      {(concept.readiness * 100).toFixed(0)}%
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        concept.confidence === 'high'
                          ? 'bg-[#16A34A]/10 text-[#16A34A]'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}
                    >
                      {concept.confidence}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Recommended Study Plan</h2>
          <p className="text-sm text-[#4A5568] mb-4">
            This plan is ordered to help you build foundational concepts first before moving to advanced topics.
          </p>
          <div className="space-y-3">
            {studyPlan.map((item) => (
              <div key={item.step} className="flex gap-4 items-start border border-[#E2E8F0] rounded-lg p-4">
                <div className="w-8 h-8 rounded-full bg-[#FFCB05] flex items-center justify-center text-[#00274C] font-medium flex-shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#1A1A2E] mb-1">{item.concept}</div>
                  <div className="text-sm text-[#4A5568]">{item.reason}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.readiness * 100}%`,
                          backgroundColor: getReadinessColor(item.readiness),
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#94A3B8]">{(item.readiness * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-[#00274C] mb-4">Study Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors text-sm font-medium">
              Listen to Audio Summary
            </button>
            <button className="px-4 py-3 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors text-sm font-medium">
              View Presentation
            </button>
            <button className="px-4 py-3 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors text-sm font-medium">
              Watch Walkthrough
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#00274C] mb-2">Need Help?</h3>
          <p className="text-sm text-[#4A5568]">
            Contact your instructor or TA: Prof. Smith (smith@umich.edu)
          </p>
        </div>
      </div>
    </div>
  );
}
