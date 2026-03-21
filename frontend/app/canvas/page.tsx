'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layout, Clock, Trash2 } from 'lucide-react';

interface ProjectEntry {
  id: string;
  name: string;
  updatedAt: string;
}

function getProjects(): ProjectEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('canvas_projects_index');
  return raw ? (JSON.parse(raw) as ProjectEntry[]) : [];
}

function saveProjectsIndex(projects: ProjectEntry[]) {
  localStorage.setItem('canvas_projects_index', JSON.stringify(projects));
}

function getCanvasRole() {
  if (typeof window === 'undefined') return 'instructor';
  const role = localStorage.getItem('canvas_role_preference');
  return role === 'student' ? 'student' : 'instructor';
}

export default function CanvasProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectEntry[]>(getProjects);

  const createProject = () => {
    const id = `proj-${Date.now()}`;
    const entry: ProjectEntry = {
      id,
      name: 'Untitled Workspace',
      updatedAt: new Date().toISOString(),
    };
    const updated = [entry, ...projects];
    setProjects(updated);
    saveProjectsIndex(updated);
    const role = getCanvasRole();
    router.push(`/canvas/${id}?role=${role}`);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjectsIndex(updated);
    localStorage.removeItem(`canvas_project_${id}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#00274C]">Canvas Workspaces</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Create and manage your infinite canvas study spaces
            </p>
          </div>
          <button
            onClick={createProject}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00274C] text-white rounded-lg hover:bg-[#1B365D] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-[#E2E8F0] rounded-xl">
            <Layout className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
            <h2 className="text-lg font-medium text-[#1A1A2E] mb-2">No workspaces yet</h2>
            <p className="text-sm text-[#64748B] mb-6">
              Create your first canvas workspace to get started
            </p>
            <button
              onClick={createProject}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFCB05] text-[#00274C] rounded-lg hover:bg-[#FFCB05]/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => {
                  const role = getCanvasRole();
                  router.push(`/canvas/${project.id}?role=${role}`);
                }}
                className="group bg-white border border-[#E2E8F0] rounded-xl p-5 cursor-pointer hover:border-[#00274C] hover:shadow-md transition-all"
              >
                <div className="h-28 bg-[#F1F5F9] rounded-lg mb-4 flex items-center justify-center">
                  <Layout className="w-8 h-8 text-[#94A3B8]" />
                </div>
                <h3 className="text-sm font-medium text-[#1A1A2E] mb-1 truncate">
                  {project.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
