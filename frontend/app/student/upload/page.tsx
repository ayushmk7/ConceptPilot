'use client';

import { useState } from 'react';
import { Check, CloudUpload, Loader2, FileText, ArrowRight } from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { DotPattern } from '@/components/svg/DotPattern';
import { useRouter } from 'next/navigation';

export default function StudentUpload() {
  const [uploaded, setUploaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleUpload = () => {
    setUploaded(true);
  };

  const handleAnalyze = () => {
    setProcessing(true);
    // Brief visual feedback then complete
    requestAnimationFrame(() => {
      setProcessing(false);
      setDone(true);
    });
  };

  return (
    <StudentLayout>
      <div className="relative max-w-3xl mx-auto px-6 py-8">
        <DotPattern className="text-muted-foreground" />

        <div className="relative">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-semibold text-primary mb-1">Upload Your Test</h1>
            <p className="text-sm text-muted-foreground">
              Upload your exam or test file to get a personalized concept readiness analysis.
            </p>
          </div>

          <div className="card-elevated p-8 animate-fade-in-up delay-100">
            {!done ? (
              <>
                {/* Upload area */}
                {!uploaded ? (
                  <div>
                    <h2 className="text-lg font-semibold text-primary mb-2">Select your file</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Upload your graded exam or test scores. We accept CSV files with your question-level scores.
                    </p>
                    <div
                      onClick={handleUpload}
                      className="group border-2 border-dashed border-input rounded-xl p-12 text-center cursor-pointer hover:border-chart-5/40 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <CloudUpload className="w-8 h-8 text-chart-5" />
                      </div>
                      <p className="text-sm text-secondary-text mb-1">Drop your scores file here or click to browse</p>
                      <p className="text-xs text-muted-foreground">CSV files up to 5MB</p>
                    </div>

                    <div className="mt-6 border border-border rounded-xl p-4">
                      <h3 className="text-sm font-medium text-foreground mb-2">Expected format</h3>
                      <p className="text-xs text-secondary-text mb-3">
                        Your CSV should have question identifiers and your scores. Example:
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs text-secondary-text">
                        question_id,score,max_score<br />
                        Q1,8,10<br />
                        Q2,5,10<br />
                        Q3,10,10
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* File uploaded confirmation */}
                    <div className="border border-chart-4/20 rounded-xl p-6 bg-chart-4/5 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-chart-4 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">File uploaded successfully</p>
                          <div className="mt-2 text-sm text-secondary-text space-y-1">
                            <p>File: midterm1_scores.csv</p>
                            <p>Questions: 25</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Course/exam selection */}
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">Course</label>
                        <select className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-5/20 bg-white text-sm">
                          <option>EECS 280</option>
                          <option>EECS 281</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">Exam</label>
                        <select className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-5/20 bg-white text-sm">
                          <option>Midterm 1</option>
                          <option>Midterm 2</option>
                          <option>Final</option>
                        </select>
                      </div>
                    </div>

                    {processing ? (
                      <div className="text-center py-8">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                          <Loader2 className="w-7 h-7 text-chart-5 animate-spin" />
                        </div>
                        <p className="text-sm text-secondary-text">Analyzing your exam results...</p>
                        <p className="text-xs text-muted-foreground mt-1">Computing concept readiness scores</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleAnalyze}
                        className="w-full bg-chart-5 hover:bg-blue-600 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        Analyze My Results
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Analysis complete */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-chart-4/10 flex items-center justify-center mx-auto mb-5">
                  <Check className="w-8 h-8 text-chart-4" />
                </div>
                <h2 className="text-xl font-semibold text-primary mb-2">Analysis Complete</h2>
                <p className="text-sm text-secondary-text mb-8 max-w-md mx-auto">
                  Your concept readiness has been computed. View your detailed report or study plan.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/student/report')}
                    className="bg-chart-5 hover:bg-blue-600 text-white rounded-lg py-3 px-6 font-medium transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View My Report
                  </button>
                  <button
                    onClick={() => router.push('/student/study-plan')}
                    className="btn-outline py-3 px-6 inline-flex items-center justify-center gap-2"
                  >
                    View Study Plan
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
