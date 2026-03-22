'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Layout, Clock, Trash2, Loader2 } from 'lucide-react';
import {
  listCanvasWorkspaces,
  createCanvasWorkspace,
  deleteCanvasWorkspace,
  type CanvasWorkspaceApi,
} from '@/lib/canvas-api';

export default function CanvasProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleSuffix = searchParams.get('role') === 'student' ? '?role=student' : '';
  const [projects, setProjects] = useState<CanvasWorkspaceApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const rows = await listCanvasWorkspaces();
      setProjects(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = async () => {
    setError(null);
    try {
      const row = await createCanvasWorkspace();
      router.push(`/canvas/${row.id}${roleSuffix}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create workspace');
    }
  };

  const deleteProject = async (id: string) => {
    setError(null);
    try {
      await deleteCanvasWorkspace(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete workspace');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Canvas Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage your infinite canvas study spaces
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createProject()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Workspace
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-destructive border border-destructive/20 rounded-lg px-4 py-2 bg-destructive/5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-xl">
            <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">No workspaces yet</h2>
            <p className="text-sm text-muted-foreground mb-6">Create your first canvas workspace to get started</p>
            <button
              type="button"
              onClick={() => void createProject()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/canvas/${project.id}${roleSuffix}`);
                  }
                }}
                onClick={() => router.push(`/canvas/${project.id}${roleSuffix}`)}
                className="group bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all text-left"
              >
                <div className="h-28 bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <Layout className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1 truncate">{project.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteProject(project.id);
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
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
