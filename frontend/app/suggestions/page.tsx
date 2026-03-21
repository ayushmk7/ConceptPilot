'use client';

import React, { useState } from 'react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { Check, X, ChevronDown } from 'lucide-react';

const suggestions = [
  {
    id: 1,
    type: 'Edge',
    created: '2024-03-15',
    status: 'pending',
    preview: 'Memory Management → Pointers',
    details: 'AI suggests adding prerequisite edge from Memory Management to Pointers based on concept dependencies.',
  },
  {
    id: 2,
    type: 'Concept Tag',
    created: '2024-03-15',
    status: 'pending',
    preview: 'Q12: Add "Dynamic Memory" tag',
    details: 'Question 12 discusses malloc/free patterns. AI suggests adding "Dynamic Memory" concept tag.',
  },
  {
    id: 3,
    type: 'Intervention',
    created: '2024-03-14',
    status: 'accepted',
    preview: 'Focus on Pointers fundamentals',
    details: 'Review pointer dereferencing and address-of operators before advancing to dynamic memory.',
  },
  {
    id: 4,
    type: 'Edge',
    created: '2024-03-14',
    status: 'rejected',
    preview: 'Arrays → Classes',
    details: 'AI suggested edge, but instructor determined it\'s not a direct prerequisite relationship.',
  },
];

export default function AISuggestions() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, string>>(
    Object.fromEntries(suggestions.map((s) => [s.id, s.status]))
  );

  const handleAccept = (id: number) => {
    setStatuses({ ...statuses, [id]: 'accepted' });
  };

  const handleReject = (id: number) => {
    setStatuses({ ...statuses, [id]: 'rejected' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-[#16A34A]/10 text-[#16A34A]';
      case 'rejected':
        return 'bg-[#DC2626]/10 text-[#DC2626]';
      default:
        return 'bg-[#F59E0B]/10 text-[#F59E0B]';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Edge':
        return 'bg-[#3B82F6]/10 text-[#3B82F6]';
      case 'Concept Tag':
        return 'bg-[#FFCB05]/20 text-[#00274C]';
      case 'Intervention':
        return 'bg-[#16A34A]/10 text-[#16A34A]';
      default:
        return 'bg-[#E8EEF4] text-[#00274C]';
    }
  };

  return (
    <InstructorLayout>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[#00274C]">AI Suggestions Review</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-[#16A34A] text-[#16A34A] rounded-md hover:bg-[#16A34A]/10 transition-colors text-sm font-medium">
              Accept All Pending
            </button>
            <button className="px-4 py-2 border border-[#DC2626] text-[#DC2626] rounded-md hover:bg-[#DC2626]/10 transition-colors text-sm font-medium">
              Reject All Pending
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-[#4A5568]">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[#4A5568]">Preview</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[#4A5568]">Created</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[#4A5568]">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[#4A5568]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <React.Fragment key={suggestion.id}>
                  <tr
                    className="border-b border-[#E2E8F0] hover:bg-[#E8EEF4] transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                  >
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(suggestion.type)}`}>
                        {suggestion.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#1A1A2E]">{suggestion.preview}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#94A3B8] transition-transform ${
                            expandedId === suggestion.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-[#4A5568]">{suggestion.created}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(statuses[suggestion.id])}`}>
                        {statuses[suggestion.id]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {statuses[suggestion.id] === 'pending' && (
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAccept(suggestion.id)}
                            className="p-1.5 hover:bg-[#16A34A]/10 rounded transition-colors"
                            title="Accept"
                          >
                            <Check className="w-4 h-4 text-[#16A34A]" />
                          </button>
                          <button
                            onClick={() => handleReject(suggestion.id)}
                            className="p-1.5 hover:bg-[#DC2626]/10 rounded transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4 text-[#DC2626]" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === suggestion.id && (
                    <tr className="bg-[#F1F5F9]">
                      <td colSpan={5} className="py-4 px-4">
                        <div className="text-sm text-[#4A5568]">
                          <p className="mb-3">{suggestion.details}</p>
                          {suggestion.type === 'Edge' && (
                            <div className="border border-[#E2E8F0] rounded bg-white p-4">
                              <p className="text-xs text-[#94A3B8] mb-2">Graph Preview</p>
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-2 bg-[#E8EEF4] rounded text-sm text-[#00274C]">
                                  Memory Management
                                </div>
                                <div className="flex-1 h-px border-t-2 border-dashed border-[#FFCB05]" />
                                <div className="px-3 py-2 bg-[#E8EEF4] rounded text-sm text-[#00274C]">
                                  Pointers
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </InstructorLayout>
  );
}
