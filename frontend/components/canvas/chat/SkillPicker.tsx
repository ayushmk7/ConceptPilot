'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const SKILLS = [
  { id: 'Tutor', label: 'Tutor', description: 'Patient step-by-step guidance' },
  { id: 'Socratic', label: 'Socratic', description: 'Questions that lead you to answers' },
  { id: 'Research Assistant', label: 'Researcher', description: 'Summarize and synthesize info' },
] as const;

interface SkillPickerProps {
  currentSkill: string;
  onSelect: (skill: string) => void;
}

export function SkillPicker({ currentSkill, onSelect }: SkillPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const active = SKILLS.find((s) => s.id === currentSkill) ?? SKILLS[0];

  // Compute position after the button is in its final painted position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 bg-accent text-primary rounded text-xs font-medium hover:bg-accent/80 transition-colors whitespace-nowrap"
      >
        {active.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && pos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className="bg-white rounded-lg shadow-lg border border-border py-1 min-w-[220px]"
          >
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
