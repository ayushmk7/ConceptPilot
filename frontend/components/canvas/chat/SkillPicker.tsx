'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const SKILLS = [
  { id: 'tutor', label: 'Tutor', description: 'General study help and Q&A' },
  { id: 'quiz', label: 'Quiz', description: 'Generate practice questions' },
  { id: 'summarize', label: 'Summarize', description: 'Condense notes and readings' },
  { id: 'explain', label: 'Explain', description: 'Break down complex concepts' },
  { id: 'debug', label: 'Debug', description: 'Help fix code or logic errors' },
] as const;

interface SkillPickerProps {
  currentSkill: string;
  onSelect: (skill: string) => void;
}

export function SkillPicker({ currentSkill, onSelect }: SkillPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const active = SKILLS.find((s) => s.id === currentSkill.toLowerCase()) ?? SKILLS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 bg-accent text-primary rounded text-xs font-medium hover:bg-accent/80 transition-colors"
      >
        {active.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[200px]">
            {SKILLS.map((skill) => (
              <button
                key={skill.id}
                onClick={() => {
                  onSelect(skill.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                  skill.id === active.id ? 'bg-muted' : ''
                }`}
              >
                <div className="text-sm font-medium text-foreground">{skill.label}</div>
                <div className="text-xs text-muted-foreground">{skill.description}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
