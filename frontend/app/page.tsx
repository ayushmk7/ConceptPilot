import Link from 'next/link';
import { ArrowRight, BarChart3, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { WaveDivider } from '@/components/svg/WaveDivider';
import { ConceptGraphIcon } from '@/components/svg/ConceptGraphIcon';
import { HeroNetwork } from '@/components/svg/HeroNetwork';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Nav */}
      <nav className="h-14 bg-[#00274C] text-white flex items-center px-6 relative z-10">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <ConceptGraphIcon size={24} className="text-white" />
          PreReq
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#00274C] via-[#0a3260] to-[#1B365D] overflow-hidden">
        <HeroNetwork className="opacity-60" />

        {/* Glow orbs */}
        <div className="absolute top-10 left-[15%] w-64 h-64 rounded-full bg-[#FFCB05]/10 blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-10 right-[10%] w-80 h-80 rounded-full bg-[#3B82F6]/10 blur-3xl animate-pulse-soft delay-500" />

        <div className="relative max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-sm mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFCB05]" />
            AI-powered concept readiness analytics
          </div>
          <h1 className="text-3xl md:text-[2.75rem] md:leading-tight font-semibold text-white mb-5 animate-fade-in-up">
            Turn exams into{' '}
            <span className="text-[#FFCB05]">conceptual insight</span>
          </h1>
          <p className="text-base md:text-lg text-white/70 mb-12 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Upload exam data, map concepts, and get explainable readiness analytics — for instructors and students alike.
          </p>

          {/* Role selection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto animate-fade-in-up delay-200">
            <Link
              href="/dashboard"
              className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left hover:bg-white/15 transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FFCB05]/20 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6 text-[#FFCB05]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">I&apos;m an Instructor</h3>
              <p className="text-sm text-white/60 mb-4 leading-relaxed">
                Upload scores, build concept graphs, view class analytics, and generate student reports.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#FFCB05] font-medium group-hover:gap-2.5 transition-all">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href="/student"
              className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left hover:bg-white/15 transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">I&apos;m a Student</h3>
              <p className="text-sm text-white/60 mb-4 leading-relaxed">
                View your concept readiness, identify weak areas, and get a personalized study plan.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#3B82F6] font-medium group-hover:gap-2.5 transition-all">
                View My Report <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        <WaveDivider fill="#FAFBFC" />
      </div>

      {/* Features — two columns for instructor/student */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14 animate-fade-in-up">
          <h2 className="text-2xl font-semibold text-[#00274C] mb-3">Two experiences, one platform</h2>
          <p className="text-[#4A5568] max-w-xl mx-auto">
            PreReq serves both instructors and students with purpose-built views for each role.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Instructor column */}
          <div className="animate-fade-in-up delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFF8E1] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#00274C]" />
              </div>
              <h3 className="text-lg font-semibold text-[#00274C]">For Instructors</h3>
            </div>
            <div className="space-y-4">
              {[
                { icon: BarChart3, title: 'Class-wide Analytics', desc: 'Heatmaps, readiness scores, and alert systems across all concepts and students.' },
                { icon: BookOpen, title: 'Root-Cause Tracing', desc: 'Trace weak performance to specific prerequisite gaps through the dependency graph.' },
                { icon: GraduationCap, title: 'Intervention Prioritization', desc: 'AI-ranked recommendations for which concepts to address first for maximum impact.' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="card-elevated p-5 flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#FFF8E1] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[#00274C]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A2E] mb-1">{f.title}</div>
                      <p className="text-sm text-[#4A5568] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student column */}
          <div className="animate-fade-in-up delay-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold text-[#00274C]">For Students</h3>
            </div>
            <div className="space-y-4">
              {[
                { icon: BarChart3, title: 'Personal Readiness Map', desc: 'See your concept-level readiness visualized as an interactive dependency graph.' },
                { icon: BookOpen, title: 'Weak Concept Identification', desc: 'Understand which foundational gaps are holding back your overall readiness.' },
                { icon: GraduationCap, title: 'Personalized Study Plan', desc: 'Get a prerequisite-ordered plan that builds foundational concepts first.' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="card-elevated p-5 flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[#3B82F6]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A2E] mb-1">{f.title}</div>
                      <p className="text-sm text-[#4A5568] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-[#00274C] to-[#1B365D] relative">
        <WaveDivider fill="#00274C" flip />
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold text-white mb-3">How it works</h2>
            <p className="text-white/60 max-w-lg mx-auto">From raw exam data to personalized insight in three steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { num: '01', title: 'Upload Data', desc: 'Instructors upload exam scores and question-to-concept mappings. Students upload their test for analysis.' },
              { num: '02', title: 'Map & Compute', desc: 'Define prerequisite graphs and tune readiness parameters. AI helps with concept mapping.' },
              { num: '03', title: 'Get Insights', desc: 'Instructors see class analytics and alerts. Students get personalized readiness reports and study plans.' },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
                  <span className="text-xl font-bold text-[#FFCB05]">{s.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <WaveDivider fill="#FAFBFC" />
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold text-[#00274C] mb-4">Ready to understand your classroom?</h2>
        <p className="text-[#4A5568] mb-8 max-w-lg mx-auto">
          Start with a single exam. See the difference concept-aware analytics can make.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/upload" className="btn-accent inline-flex items-center gap-2 px-7 py-3 text-base">
            Instructor Setup <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/student" className="btn-outline inline-flex items-center gap-2 px-7 py-3 text-base">
            Student Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <ConceptGraphIcon size={20} className="text-[#CBD5E1]" />
            PreReq
          </div>
          <div className="flex gap-6 text-sm text-[#94A3B8]">
            <a href="#" className="hover:text-[#00274C] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#00274C] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
