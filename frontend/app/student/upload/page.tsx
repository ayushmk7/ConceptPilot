'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, CloudUpload, Loader2, FileText, ArrowRight, BookOpen } from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import * as api from '@/lib/api';
import { resolveScoresAndMappingFiles } from '@/lib/student-upload-csv';

type Mode = 'choose' | 'test' | 'material';

export default function StudentUpload() {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [scoresFile, setScoresFile] = useState<File | null>(null);
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);

  const applyCsvFiles = async (fileList: FileList | File[]) => {
    const raw = Array.from(fileList).filter((f) => /\.csv$/i.test(f.name) || f.type === 'text/csv');
    if (raw.length === 0) {
      setError('Add CSV files only (.csv).');
      return;
    }
    setError(null);
    const { scores, mapping } = await resolveScoresAndMappingFiles(raw);
    setScoresFile(scores);
    setMappingFile(mapping);
  };

  const runTestPipeline = async () => {
    if (!scoresFile || !mappingFile) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.studentUploadScores(scoresFile);
      await api.studentUploadMapping(mappingFile);
      await api.studentRunCompute();
      setMessage('Upload and compute completed. View your report and study plan next.');
    } catch (e) {
      setError(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const runMaterial = async () => {
    if (!materialFile) {
      setError('Select a PDF or text file.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.studentUploadStudyMaterial(materialFile);
      setMessage('Study material ingested and concept graph updated.');
    } catch (e) {
      setError(e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudentLayout>
      <div className="relative max-w-3xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Upload</h1>
            <p className="text-sm text-muted-foreground">
              Add graded test data or study materials. Data is tied to your browser workspace for this exam.
            </p>
          </div>

          {mode === 'choose' && (
            <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up">
              <button
                type="button"
                onClick={() => setMode('test')}
                className="card-elevated p-6 text-left hover:border-primary/30 transition-colors"
              >
                <FileText className="w-8 h-8 text-chart-5 mb-3" />
                <h2 className="font-semibold text-primary mb-1">Graded test / scores</h2>
                <p className="text-xs text-muted-foreground">
                  CSV scores plus question→concept mapping (same format as instructor upload). Runs compute for readiness.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode('material')}
                className="card-elevated p-6 text-left hover:border-primary/30 transition-colors"
              >
                <BookOpen className="w-8 h-8 text-chart-3 mb-3" />
                <h2 className="font-semibold text-primary mb-1">Study material</h2>
                <p className="text-xs text-muted-foreground">
                  PDF or text notes. We extract concepts and build a draft graph for study content.
                </p>
              </button>
            </div>
          )}

          {mode === 'test' && (
            <div className="card-elevated p-8 animate-fade-in-up space-y-6">
              <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode('choose')}>
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-primary">Test data (CSV)</h2>
              <p className="text-sm text-muted-foreground">
                Add both files in one step: choose or drop up to two CSVs (e.g. <span className="font-mono text-xs">scores.csv</span> and{' '}
                <span className="font-mono text-xs">mapping.csv</span>), or multi-select in the file dialog (Ctrl/Cmd+click). We match them by
                name and column headers.
              </p>
              <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
                Scores CSV must include columns such as <span className="font-mono">StudentID</span>, <span className="font-mono">QuestionID</span>,{' '}
                <span className="font-mono">Score</span>, <span className="font-mono">MaxScore</span>. There is no exam-id column — your workspace exam is
                sent automatically when you upload (no extra CSV field).
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list?.length) void applyCsvFiles(list);
                  e.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    csvInputRef.current?.click();
                  }
                }}
                onClick={() => csvInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCsvDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCsvDragOver(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCsvDragOver(false);
                  if (e.dataTransfer.files?.length) void applyCsvFiles(e.dataTransfer.files);
                }}
                className={`rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors cursor-pointer ${
                  csvDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <CloudUpload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium text-primary">Drop CSV files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Two files: scores + question→concept mapping</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Scores:</span>
                  {scoresFile ? (
                    <span className="font-medium text-foreground">{scoresFile.name}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Not set</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Mapping:</span>
                  {mappingFile ? (
                    <span className="font-medium text-foreground">{mappingFile.name}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Not set</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={busy || !scoresFile || !mappingFile}
                title={!scoresFile || !mappingFile ? 'Select both CSV files above first' : undefined}
                onClick={() => void runTestPipeline()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                Upload &amp; compute
              </button>
            </div>
          )}

          {mode === 'material' && (
            <div className="card-elevated p-8 animate-fade-in-up space-y-6">
              <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode('choose')}>
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-primary">Study material</h2>
              <label className="block">
                <span className="text-sm font-medium">PDF or text file</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runMaterial()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                Ingest material
              </button>
            </div>
          )}

          {message && (
            <div className="relative z-20 mt-6 p-4 rounded-xl border border-chart-4/30 bg-chart-4/5 text-sm text-secondary-text flex items-start gap-3">
              <Check className="w-5 h-5 text-chart-4 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p>{message}</p>
                <Link
                  href="/student/report"
                  className="mt-2 text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  prefetch
                >
                  Open report <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </StudentLayout>
  );
}
