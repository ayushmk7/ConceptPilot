import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart3, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { WaveDivider } from '@/components/svg/WaveDivider';
import { SplitText } from '@/components/animations/SplitText';
import { StreakingLines } from '@/components/animations/StreakingLines';
import BlurText from '@/components/animations/BlurText';
import { BlurFadeIn } from '@/components/animations/BlurFadeIn';


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="h-14 bg-primary text-white flex items-center px-6 relative z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo/conceptpilot-logo.png" alt="ConceptPilot logo" width={28} height={21} className="rounded-sm" />
          <span className="text-lg font-semibold tracking-tight">ConceptPilot</span>
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative bg-primary overflow-hidden">
        <StreakingLines className="absolute inset-0 z-0 w-full h-full" />

        <div className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center">
          <h1 className="mb-0">
            <SplitText
              text="ConceptPilot"
              className="text-6xl md:text-8xl lg:text-9xl font-extrabold text-white tracking-tight font-[family-name:var(--font-sergio-trendy)]"
            />
          </h1>
          <div className="h-1.5 w-32 bg-accent rounded-full mx-auto mt-4 mb-6" />
          <BlurText
            text="Upload exam data, map concepts, and get explainable readiness analytics — for instructors and students alike."
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10"
            animateBy="words"
            direction="bottom"
            delay={80}
            stepDuration={0.4}
            animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 30 }}
            animationTo={[
              { filter: 'blur(5px)', opacity: 0.5, y: -3 },
              { filter: 'blur(0px)', opacity: 1, y: 0 },
            ]}
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <BlurFadeIn delay={1.2} duration={0.6} direction="bottom" blur={10}>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-accent text-primary font-semibold text-base hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:bg-accent/90 transition-all"
              >
                <ShieldCheck className="w-5 h-5" />
                Instructors
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </BlurFadeIn>

            <BlurFadeIn delay={1.5} duration={0.6} direction="bottom" blur={10}>
              <Link
                href="/student"
                className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-transparent border-2 border-white text-white font-semibold text-base hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:bg-white/20 transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <GraduationCap className="w-5 h-5" />
                Students
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </BlurFadeIn>
          </div>
        </div>

        <WaveDivider fill="var(--background)" />
      </div>

      {/* Features — side-by-side split for instructor/student */}
      <div className="pt-20 pb-16">
        <div className="text-center mb-14 px-6 animate-fade-in-up">
          <h2 className="text-2xl font-semibold text-primary mb-3">Two experiences, one platform</h2>
          <p className="text-secondary-text max-w-xl mx-auto">
            ConceptPilot serves both instructors and students with purpose-built views for each role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto px-6 gap-10">
          {/* Instructor panel — left */}
          <div className="animate-fade-in-up delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl border-2 border-accent flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-primary">For Instructors</h3>
            </div>
            <div className="space-y-4">
              {[
                { icon: BarChart3, title: 'Class-wide Analytics', desc: 'Heatmaps, readiness scores, and alert systems across all concepts and students.' },
                { icon: BookOpen, title: 'Root-Cause Tracing', desc: 'Trace weak performance to specific prerequisite gaps through the dependency graph.' },
                { icon: GraduationCap, title: 'Intervention Prioritization', desc: 'AI-ranked recommendations for which concepts to address first for maximum impact.' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-xl border-2 border-accent/40 bg-transparent p-5 flex items-start gap-4 hover:border-accent/70 transition-colors animate-fade-in-up" style={{ animationDelay: `${150 + i * 50}ms` }}>
                    <div className="w-9 h-9 rounded-lg border border-accent/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-foreground mb-1">{f.title}</div>
                      <p className="text-sm text-secondary-text leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student panel — right */}
          <div className="animate-fade-in-up delay-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl border-2 border-chart-5 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-chart-5" />
              </div>
              <h3 className="text-lg font-semibold text-primary">For Students</h3>
            </div>
            <div className="space-y-4">
              {[
                { icon: BarChart3, title: 'Personal Readiness Map', desc: 'See your concept-level readiness visualized as an interactive dependency graph.' },
                { icon: BookOpen, title: 'Weak Concept Identification', desc: 'Understand which foundational gaps are holding back your overall readiness.' },
                { icon: GraduationCap, title: 'Personalized Study Plan', desc: 'Get a prerequisite-ordered plan that builds foundational concepts first.' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-xl border-2 border-chart-5/40 bg-transparent p-5 flex items-start gap-4 hover:border-chart-5/70 transition-colors animate-fade-in-up" style={{ animationDelay: `${250 + i * 50}ms` }}>
                    <div className="w-9 h-9 rounded-lg border border-chart-5/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5 text-chart-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-foreground mb-1">{f.title}</div>
                      <p className="text-sm text-secondary-text leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-primary to-chart-2 relative">
        <WaveDivider fill="var(--primary)" flip />
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-semibold text-white mb-3">How it works</h2>
            <p className="text-white/60 max-w-lg mx-auto">From raw exam data to personalized insight — tailored for each role.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Instructor steps */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-white">For Instructors</h3>
              </div>
              <div className="space-y-4">
                {[
                  { num: '01', title: 'Upload Exam Data', desc: 'Upload student scores and question-to-concept mapping CSVs.' },
                  { num: '02', title: 'Build Concept Graph', desc: 'Define prerequisite relationships or let AI generate them.' },
                  { num: '03', title: 'Tune Parameters', desc: 'Adjust readiness weights and clustering settings.' },
                  { num: '04', title: 'View Class Analytics', desc: 'Explore heatmaps, alerts, interventions, and student clusters.' },
                ].map((s, i, arr) => (
                  <div key={s.num} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-accent">{s.num}</span>
                      </div>
                      {i < arr.length - 1 && <div className="w-px flex-1 bg-white/15 mt-2" />}
                    </div>
                    <div className="pb-4">
                      <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
                      <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student steps */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-chart-5/20 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-chart-5" />
                </div>
                <h3 className="text-base font-semibold text-white">For Students</h3>
              </div>
              <div className="space-y-4">
                {[
                  { num: '01', title: 'Access Your Report', desc: 'Open your personalized readiness report via a shared link or portal.' },
                  { num: '02', title: 'Explore Concept Map', desc: 'Visualize your strengths and gaps on an interactive dependency graph.' },
                  { num: '03', title: 'Review Focus Areas', desc: 'See which foundational concepts need the most attention.' },
                  { num: '04', title: 'Follow Study Plan', desc: 'Get a prerequisite-ordered plan with resources for each concept.' },
                ].map((s, i, arr) => (
                  <div key={s.num} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-chart-5">{s.num}</span>
                      </div>
                      {i < arr.length - 1 && <div className="w-px flex-1 bg-white/15 mt-2" />}
                    </div>
                    <div className="pb-4">
                      <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
                      <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <WaveDivider fill="var(--background)" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image src="/logo/conceptpilot-logo.png" alt="ConceptPilot logo" width={24} height={18} className="rounded-sm" />
            <span>ConceptPilot</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
