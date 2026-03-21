import { useState } from 'react';
import { Check, Upload, Loader2, AlertCircle } from 'lucide-react';
import { InstructorLayout } from '../components/InstructorLayout';
import { useNavigate } from 'react-router';

type Step = 1 | 2 | 3 | 4 | 5;

export function UploadWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [course, setCourse] = useState('');
  const [exam, setExam] = useState('');
  const [scoresUploaded, setScoresUploaded] = useState(false);
  const [mappingUploaded, setMappingUploaded] = useState(false);
  const [graphOption, setGraphOption] = useState<'upload' | 'ai'>('upload');
  const [graphUploaded, setGraphUploaded] = useState(false);
  const [computing, setComputing] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { num: 1, label: 'Course & Exam' },
    { num: 2, label: 'Scores' },
    { num: 3, label: 'Mapping' },
    { num: 4, label: 'Graph' },
    { num: 5, label: 'Parameters & Compute' },
  ];

  const handleCompute = () => {
    setComputing(true);
    setTimeout(() => {
      setComputing(false);
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <InstructorLayout>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between mb-12">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ${
                    step.num < currentStep
                      ? 'bg-[#16A34A] text-white'
                      : step.num === currentStep
                      ? 'bg-[#FFCB05] text-[#00274C]'
                      : 'bg-[#E2E8F0] text-[#94A3B8]'
                  }`}
                >
                  {step.num < currentStep ? <Check className="w-5 h-5" /> : step.num}
                </div>
                <span className="text-xs mt-2 text-[#4A5568] text-center">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-6 ${step.num < currentStep ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 shadow-sm">
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-6">Course & Exam Selection</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">
                    Select Course
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00274C]"
                  >
                    <option value="">Choose a course...</option>
                    <option value="eecs280">EECS 280</option>
                    <option value="eecs281">EECS 281</option>
                    <option value="new">+ Create New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">
                    Select Exam
                  </label>
                  <select
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00274C]"
                  >
                    <option value="">Choose an exam...</option>
                    <option value="midterm1">Midterm 1</option>
                    <option value="midterm2">Midterm 2</option>
                    <option value="final">Final</option>
                    <option value="new">+ Create New</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!course || !exam}
                  className="px-6 py-2 bg-[#00274C] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1B365D] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-6">Upload Scores</h2>
              {!scoresUploaded ? (
                <div
                  onClick={() => setScoresUploaded(true)}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-12 text-center cursor-pointer hover:border-[#00274C] transition-colors"
                >
                  <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
                  <p className="text-sm text-[#4A5568]">Drop scores CSV here or click to browse</p>
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-lg p-6 bg-[#F1F5F9]">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#16A34A] mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-[#1A1A2E]">Scores uploaded successfully</p>
                      <div className="mt-2 text-sm text-[#4A5568] space-y-1">
                        <p>Rows: 247</p>
                        <p>Students: 247</p>
                        <p>Questions: 25</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!scoresUploaded}
                  className="px-6 py-2 bg-[#00274C] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1B365D] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-6">Upload Mapping</h2>
              {!mappingUploaded ? (
                <div
                  onClick={() => setMappingUploaded(true)}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-12 text-center cursor-pointer hover:border-[#00274C] transition-colors"
                >
                  <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
                  <p className="text-sm text-[#4A5568]">Drop mapping CSV here or click to browse</p>
                </div>
              ) : (
                <div>
                  <div className="border border-[#E2E8F0] rounded-lg p-6 bg-[#F1F5F9]">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#16A34A] mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-[#1A1A2E]">Mapping uploaded successfully</p>
                        <div className="mt-2 text-sm text-[#4A5568] space-y-1">
                          <p>Concepts: 12</p>
                          <p>Mapped questions: 23 of 25</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-l-4 border-[#F59E0B] bg-[#FFF8E1] p-4 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-[#F59E0B] mt-0.5" />
                      <p className="text-sm text-[#4A5568]">2 questions are unmapped and will be excluded from analysis.</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!mappingUploaded}
                  className="px-6 py-2 bg-[#00274C] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1B365D] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-6">Concept Graph</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setGraphOption('upload')}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    graphOption === 'upload'
                      ? 'border-[#00274C] bg-[#E8EEF4]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="font-medium text-[#1A1A2E] mb-2">Upload Graph File</div>
                  <p className="text-sm text-[#4A5568]">Upload a CSV file with prerequisite edges</p>
                </div>
                <div
                  onClick={() => setGraphOption('ai')}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    graphOption === 'ai'
                      ? 'border-[#00274C] bg-[#E8EEF4]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="font-medium text-[#1A1A2E] mb-2">Generate with AI</div>
                  <p className="text-sm text-[#4A5568]">Let AI suggest prerequisite relationships</p>
                </div>
              </div>

              {graphOption === 'upload' && !graphUploaded && (
                <div
                  onClick={() => setGraphUploaded(true)}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-12 text-center cursor-pointer hover:border-[#00274C] transition-colors"
                >
                  <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
                  <p className="text-sm text-[#4A5568]">Drop graph CSV here or click to browse</p>
                </div>
              )}

              {graphOption === 'ai' && (
                <button
                  onClick={() => setGraphUploaded(true)}
                  className="w-full px-6 py-3 bg-[#FFCB05] text-[#00274C] rounded-md font-medium hover:bg-[#FFCB05]/90 transition-colors"
                >
                  Generate Edges with AI
                </button>
              )}

              {graphUploaded && (
                <div className="mt-6 border border-[#E2E8F0] rounded-lg p-6 bg-[#F1F5F9]">
                  <p className="font-medium text-[#1A1A2E] mb-4">Graph Preview</p>
                  <div className="bg-white rounded p-6 border border-[#E2E8F0]">
                    <svg viewBox="0 0 400 200" className="w-full">
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" />
                        </marker>
                      </defs>
                      <line x1="80" y1="50" x2="180" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <line x1="80" y1="150" x2="180" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <line x1="220" y1="100" x2="320" y2="100" stroke="#CBD5E1" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      <circle cx="80" cy="50" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="80" y="55" textAnchor="middle" fontSize="11" fill="#00274C">Basics</text>
                      <circle cx="80" cy="150" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="80" y="155" textAnchor="middle" fontSize="11" fill="#00274C">Arrays</text>
                      <circle cx="200" cy="100" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="200" y="105" textAnchor="middle" fontSize="11" fill="#00274C">Pointers</text>
                      <circle cx="320" cy="100" r="25" fill="#E8EEF4" stroke="#00274C" strokeWidth="2" />
                      <text x="320" y="105" textAnchor="middle" fontSize="11" fill="#00274C">Classes</text>
                    </svg>
                  </div>
                  <p className="text-sm text-[#4A5568] mt-2">12 concepts, 18 edges</p>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  disabled={!graphUploaded}
                  className="px-6 py-2 bg-[#00274C] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1B365D] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-[#00274C] mb-6">Parameters & Compute</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#4A5568]">
                      Alpha (direct readiness weight)
                    </label>
                    <span className="text-sm text-[#4A5568]">0.5</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.5" className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#4A5568]">
                      Beta (prerequisite penalty weight)
                    </label>
                    <span className="text-sm text-[#4A5568]">0.3</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#4A5568]">
                      Gamma (downstream boost weight)
                    </label>
                    <span className="text-sm text-[#4A5568]">0.2</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.2" className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#4A5568]">
                      Threshold (weakness cutoff)
                    </label>
                    <span className="text-sm text-[#4A5568]">0.6</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.6" className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    K (cluster count)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    defaultValue="3"
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00274C]"
                  />
                </div>
              </div>

              {computing ? (
                <div className="mt-8 text-center py-6">
                  <Loader2 className="w-8 h-8 text-[#00274C] animate-spin mx-auto mb-4" />
                  <p className="text-sm text-[#4A5568]">Computing readiness analytics...</p>
                </div>
              ) : (
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2 border border-[#00274C] text-[#00274C] rounded-md hover:bg-[#E8EEF4] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCompute}
                    className="px-6 py-3 bg-[#FFCB05] text-[#00274C] rounded-md font-medium hover:bg-[#FFCB05]/90 transition-colors"
                  >
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
