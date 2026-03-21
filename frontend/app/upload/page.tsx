'use client';

import { useState, useRef } from 'react';
import { Check, CloudUpload, Loader2, AlertCircle, X } from 'lucide-react';
import { InstructorLayout } from '@/components/InstructorLayout';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import type { UploadResult, ReadinessParams } from '@/lib/types';

type Step = 1 | 2 | 3 | 4 | 5;

export default function UploadWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [course, setCourse] = useState('');
  const [exam, setExam] = useState('');

  // Step 2 — Scores
  const [scoresFile, setScoresFile] = useState<File | null>(null);
  const [scoresResult, setScoresResult] = useState<UploadResult | null>(null);
  const [scoresUploading, setScoresUploading] = useState(false);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const scoresRef = useRef<HTMLInputElement>(null);

  // Step 3 — Mapping
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [mappingResult, setMappingResult] = useState<UploadResult | null>(null);
  const [mappingUploading, setMappingUploading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const mappingRef = useRef<HTMLInputElement>(null);

  // Step 4 — Graph
  const [graphOption, setGraphOption] = useState<'upload' | 'ai'>('upload');
  const [graphResult, setGraphResult] = useState<{ nodeCount: number; edgeCount: number } | null>(null);
  const [graphUploading, setGraphUploading] = useState(false);
  const graphRef = useRef<HTMLInputElement>(null);

  // Step 5 — Params & Compute
  const [params, setParams] = useState<ReadinessParams>({ alpha: 0.5, beta: 0.3, gamma: 0.2, threshold: 0.6, k: 3 });
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const router = useRouter();

  const steps = [
    { num: 1, label: 'Course & Exam', desc: 'Select your course' },
    { num: 2, label: 'Scores', desc: 'Upload student scores' },
    { num: 3, label: 'Mapping', desc: 'Map questions to concepts' },
    { num: 4, label: 'Graph', desc: 'Define prerequisites' },
    { num: 5, label: 'Compute', desc: 'Run analytics' },
  ];

  const validateCsv = (file: File): string | null => {
    if (!file.name.endsWith('.csv')) return 'Please upload a CSV file.';
    if (file.size > 10 * 1024 * 1024) return 'File size must be under 10MB.';
    return null;
  };

  const handleScoresUpload = async (file: File) => {
    const err = validateCsv(file);
    if (err) { setScoresError(err); return; }
    setScoresFile(file);
    setScoresError(null);
    setScoresUploading(true);
    try {
      const result = await api.uploadScores(file);
      if (result.errors.length > 0) {
        setScoresError(result.errors.join(', '));
      } else {
        setScoresResult(result);
      }
    } catch {
      setScoresError('Upload failed. Please try again.');
    } finally {
      setScoresUploading(false);
    }
  };

  const handleMappingUpload = async (file: File) => {
    const err = validateCsv(file);
    if (err) { setMappingError(err); return; }
    setMappingFile(file);
    setMappingError(null);
    setMappingUploading(true);
    try {
      const result = await api.uploadMapping(file);
      setMappingResult(result);
    } catch {
      setMappingError('Upload failed. Please try again.');
    } finally {
      setMappingUploading(false);
    }
  };

  const handleGraphUpload = async (file: File) => {
    setGraphUploading(true);
    try {
      const result = await api.uploadGraph(file);
      setGraphResult(result);
    } catch {
      // handled
    } finally {
      setGraphUploading(false);
    }
  };

  const handleAIGraph = async () => {
    setGraphUploading(true);
    try {
      const result = await api.generateGraphWithAI([]);
      setGraphResult(result);
    } catch {
      // handled
    } finally {
      setGraphUploading(false);
    }
  };

  const handleCompute = async () => {
    setComputing(true);
    setComputeError(null);
    try {
      await api.runCompute('e1', params);
      router.push('/dashboard');
    } catch {
      setComputeError('Compute failed. Please try again.');
      setComputing(false);
    }
  };

  const handleDrop = (e: React.DragEvent, handler: (f: File) => void) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex justify-between mb-12 animate-fade-in">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => step.num < currentStep && setCurrentStep(step.num as Step)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                    step.num < currentStep
                      ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/20 cursor-pointer'
                      : step.num === currentStep
                      ? 'bg-gradient-to-br from-[#FFCB05] to-[#f0be00] text-[#00274C] shadow-md shadow-[#FFCB05]/30'
                      : 'bg-[#E2E8F0] text-[#94A3B8] cursor-default'
                  }`}
                >
                  {step.num < currentStep ? <Check className="w-5 h-5" /> : step.num}
                </button>
                <span className={`text-xs mt-2 text-center ${step.num === currentStep ? 'font-semibold text-[#00274C]' : 'text-[#4A5568]'}`}>
                  {step.label}
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5 hidden md:block">{step.desc}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-8 rounded-full ${step.num < currentStep ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card-elevated p-8 animate-fade-in-up">
          {/* Step 1 — Course & Exam */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-2">Course & Exam Selection</h2>
              <p className="text-sm text-[#94A3B8] mb-6">Choose the course and exam you want to analyze.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">Select Course <span className="text-[#DC2626]">*</span></label>
                  <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white">
                    <option value="">Choose a course...</option>
                    <option value="eecs280">EECS 280</option>
                    <option value="eecs281">EECS 281</option>
                    <option value="new">+ Create New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">Select Exam <span className="text-[#DC2626]">*</span></label>
                  <select value={exam} onChange={(e) => setExam(e.target.value)} className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20 bg-white">
                    <option value="">Choose an exam...</option>
                    <option value="midterm1">Midterm 1</option>
                    <option value="midterm2">Midterm 2</option>
                    <option value="final">Final</option>
                    <option value="new">+ Create New</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setCurrentStep(2)} disabled={!course || !exam} className="btn-primary">Next</button>
              </div>
            </div>
          )}

          {/* Step 2 — Scores */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-2">Upload Scores</h2>
              <p className="text-sm text-[#94A3B8] mb-6">Upload a CSV file with student exam scores.</p>

              {scoresError && (
                <div className="mb-4 border border-[#DC2626]/20 bg-[#FEF2F2] rounded-xl p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[#DC2626]">{scoresError}</p>
                  </div>
                  <button onClick={() => setScoresError(null)} className="p-0.5"><X className="w-4 h-4 text-[#DC2626]" /></button>
                </div>
              )}

              {scoresUploading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-[#00274C] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#4A5568]">Uploading and validating {scoresFile?.name}...</p>
                </div>
              ) : !scoresResult ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, handleScoresUpload)}
                  onClick={() => scoresRef.current?.click()}
                  className="group border-2 border-dashed border-[#CBD5E1] rounded-xl p-12 text-center cursor-pointer hover:border-[#00274C]/40 transition-colors"
                >
                  <input ref={scoresRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleScoresUpload(e.target.files[0])} />
                  <div className="w-16 h-16 rounded-2xl bg-[#E8EEF4] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-8 h-8 text-[#00274C]" />
                  </div>
                  <p className="text-sm text-[#4A5568] mb-1">Drop scores CSV here or click to browse</p>
                  <p className="text-xs text-[#94A3B8]">CSV files up to 10MB</p>
                </div>
              ) : (
                <div className="border border-[#16A34A]/20 rounded-xl p-6 bg-[#16A34A]/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#1A1A2E]">Scores uploaded successfully</p>
                      <div className="mt-2 text-sm text-[#4A5568] space-y-1">
                        <p>File: {scoresResult.filename}</p>
                        <p>Rows: {scoresResult.rowCount}</p>
                        <p>Columns: {scoresResult.columnCount}</p>
                      </div>
                    </div>
                    <button onClick={() => { setScoresResult(null); setScoresFile(null); }} className="text-xs text-[#94A3B8] hover:text-[#4A5568]">Replace</button>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button onClick={() => setCurrentStep(1)} className="btn-outline">Back</button>
                <button onClick={() => setCurrentStep(3)} disabled={!scoresResult} className="btn-primary">Next</button>
              </div>
            </div>
          )}

          {/* Step 3 — Mapping */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-2">Upload Mapping</h2>
              <p className="text-sm text-[#94A3B8] mb-6">Map each question to one or more concepts.</p>

              {mappingError && (
                <div className="mb-4 border border-[#DC2626]/20 bg-[#FEF2F2] rounded-xl p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#DC2626] flex-1">{mappingError}</p>
                  <button onClick={() => setMappingError(null)} className="p-0.5"><X className="w-4 h-4 text-[#DC2626]" /></button>
                </div>
              )}

              {mappingUploading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-[#00274C] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#4A5568]">Uploading and validating {mappingFile?.name}...</p>
                </div>
              ) : !mappingResult ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, handleMappingUpload)}
                  onClick={() => mappingRef.current?.click()}
                  className="group border-2 border-dashed border-[#CBD5E1] rounded-xl p-12 text-center cursor-pointer hover:border-[#00274C]/40 transition-colors"
                >
                  <input ref={mappingRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleMappingUpload(e.target.files[0])} />
                  <div className="w-16 h-16 rounded-2xl bg-[#E8EEF4] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-8 h-8 text-[#00274C]" />
                  </div>
                  <p className="text-sm text-[#4A5568] mb-1">Drop mapping CSV here or click to browse</p>
                  <p className="text-xs text-[#94A3B8]">CSV files up to 10MB</p>
                </div>
              ) : (
                <div>
                  <div className="border border-[#16A34A]/20 rounded-xl p-6 bg-[#16A34A]/5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#1A1A2E]">Mapping uploaded successfully</p>
                        <div className="mt-2 text-sm text-[#4A5568] space-y-1">
                          <p>File: {mappingResult.filename}</p>
                          <p>Questions mapped: {mappingResult.rowCount}</p>
                        </div>
                      </div>
                      <button onClick={() => { setMappingResult(null); setMappingFile(null); }} className="text-xs text-[#94A3B8] hover:text-[#4A5568]">Replace</button>
                    </div>
                  </div>
                  {mappingResult.warnings.length > 0 && (
                    <div className="mt-4 border border-[#F59E0B]/20 bg-[#F59E0B]/5 rounded-xl p-4">
                      {mappingResult.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-[#4A5568]">{w}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button onClick={() => setCurrentStep(2)} className="btn-outline">Back</button>
                <button onClick={() => setCurrentStep(4)} disabled={!mappingResult} className="btn-primary">Next</button>
              </div>
            </div>
          )}

          {/* Step 4 — Graph */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-2">Concept Graph</h2>
              <p className="text-sm text-[#94A3B8] mb-6">Define prerequisite relationships between concepts.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div onClick={() => setGraphOption('upload')} className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${graphOption === 'upload' ? 'border-[#00274C] bg-[#E8EEF4]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
                  <div className="font-medium text-[#1A1A2E] mb-2">Upload Graph File</div>
                  <p className="text-sm text-[#4A5568]">Upload a CSV file with prerequisite edges</p>
                </div>
                <div onClick={() => setGraphOption('ai')} className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${graphOption === 'ai' ? 'border-[#00274C] bg-[#E8EEF4]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
                  <div className="font-medium text-[#1A1A2E] mb-2">Generate with AI</div>
                  <p className="text-sm text-[#4A5568]">Let AI suggest prerequisite relationships</p>
                </div>
              </div>

              {graphUploading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-[#00274C] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#4A5568]">{graphOption === 'ai' ? 'Generating concept graph with AI...' : 'Uploading graph...'}</p>
                </div>
              ) : graphOption === 'upload' && !graphResult ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleGraphUpload(e.dataTransfer.files[0]); }}
                  onClick={() => graphRef.current?.click()}
                  className="group border-2 border-dashed border-[#CBD5E1] rounded-xl p-12 text-center cursor-pointer hover:border-[#00274C]/40 transition-colors"
                >
                  <input ref={graphRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleGraphUpload(e.target.files[0])} />
                  <div className="w-16 h-16 rounded-2xl bg-[#E8EEF4] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-8 h-8 text-[#00274C]" />
                  </div>
                  <p className="text-sm text-[#4A5568] mb-1">Drop graph CSV here or click to browse</p>
                  <p className="text-xs text-[#94A3B8]">CSV files up to 10MB</p>
                </div>
              ) : graphOption === 'ai' && !graphResult ? (
                <button onClick={handleAIGraph} className="w-full btn-accent py-3">Generate Edges with AI</button>
              ) : null}

              {graphResult && (
                <div className="mt-6 card-elevated p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium text-[#1A1A2E]">Graph Preview</p>
                    <button onClick={() => setGraphResult(null)} className="text-xs text-[#94A3B8] hover:text-[#4A5568]">Replace</button>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
                    <svg viewBox="0 0 400 200" className="w-full">
                      <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" /></marker></defs>
                      <line x1="80" y1="50" x2="180" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <line x1="80" y1="150" x2="180" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <line x1="220" y1="100" x2="320" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <circle cx="80" cy="50" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="80" y="55" textAnchor="middle" fontSize="11" fill="#00274C">Basics</text>
                      <circle cx="80" cy="150" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="80" y="155" textAnchor="middle" fontSize="11" fill="#00274C">Arrays</text>
                      <circle cx="200" cy="100" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="200" y="105" textAnchor="middle" fontSize="11" fill="#00274C">Pointers</text>
                      <circle cx="320" cy="100" r="25" fill="#FFCB05" stroke="#00274C" strokeWidth="2" />
                      <text x="320" y="105" textAnchor="middle" fontSize="11" fill="#00274C">Classes</text>
                    </svg>
                  </div>
                  <p className="text-sm text-[#4A5568] mt-2">{graphResult.nodeCount} concepts, {graphResult.edgeCount} edges</p>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button onClick={() => setCurrentStep(3)} className="btn-outline">Back</button>
                <button onClick={() => setCurrentStep(5)} disabled={!graphResult} className="btn-primary">Next</button>
              </div>
            </div>
          )}

          {/* Step 5 — Parameters & Compute */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-2">Parameters & Compute</h2>
              <p className="text-sm text-[#94A3B8] mb-6">Fine-tune the readiness model parameters before computing.</p>
              <div className="space-y-6">
                {([
                  { key: 'alpha' as const, label: 'Alpha (direct readiness weight)' },
                  { key: 'beta' as const, label: 'Beta (prerequisite penalty weight)' },
                  { key: 'gamma' as const, label: 'Gamma (downstream boost weight)' },
                  { key: 'threshold' as const, label: 'Threshold (weakness cutoff)' },
                ]).map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-[#4A5568]">{p.label}</label>
                      <span className="text-sm text-[#00274C] bg-[#E8EEF4] px-2 py-0.5 rounded font-medium">{params[p.key].toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={params[p.key]}
                      onChange={(e) => setParams({ ...params, [p.key]: parseFloat(e.target.value) })}
                      className="w-full accent-[#00274C]"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">K (cluster count)</label>
                  <input
                    type="number" min="2" max="10"
                    value={params.k}
                    onChange={(e) => setParams({ ...params, k: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00274C]/20"
                  />
                </div>
              </div>

              {computeError && (
                <div className="mt-4 border border-[#DC2626]/20 bg-[#FEF2F2] rounded-xl p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#DC2626]">{computeError}</p>
                </div>
              )}

              {computing ? (
                <div className="mt-8 text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#E8EEF4] flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-7 h-7 text-[#00274C] animate-spin" />
                  </div>
                  <p className="text-sm text-[#4A5568]">Computing readiness analytics...</p>
                  <p className="text-xs text-[#94A3B8] mt-1">This may take a moment</p>
                </div>
              ) : (
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setCurrentStep(4)} className="btn-outline">Back</button>
                  <button onClick={handleCompute} className="btn-accent px-7 py-3">
                    Run Compute
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
}
