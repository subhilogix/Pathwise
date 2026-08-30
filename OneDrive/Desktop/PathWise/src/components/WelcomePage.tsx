import { 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Bot, 
  Clock,
  Database
} from 'lucide-react';
import type { HealthStatus } from '../services/apiClient';

interface WelcomePageProps {
  onStartOnboarding: () => void;
  hasExistingPath: boolean;
  onContinueToDashboard: () => void;
  health: HealthStatus | null;
}

export default function WelcomePage({
  onStartOnboarding,
  hasExistingPath,
  onContinueToDashboard,
  health
}: WelcomePageProps) {
  const isGeminiReady = health?.geminiConfigured ?? false;
  const isDbReady = health?.dbConnected ?? false;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-[35%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-2xl shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                PathWise <span className="text-[10px] font-semibold tracking-wider uppercase bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">Gemini Live</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Health Pill */}
            <div className="flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300">
              <div className={`w-2 h-2 rounded-full ${isGeminiReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'}`} />
              <span className="hidden sm:inline">
                {isGeminiReady ? 'Gemini 2.0 Connected' : 'Gemini Key Needed in .env'}
              </span>
            </div>

            {/* DB Health Pill */}
            <div className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>{isDbReady ? 'PostgreSQL Active' : 'DB Connecting'}</span>
            </div>

            {hasExistingPath && (
              <button
                onClick={onContinueToDashboard}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Continue Roadmap
              </button>
            )}

            <button
              onClick={onStartOnboarding}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-16 pb-24 flex flex-col justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT HERO TEXT */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Dynamic Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs font-medium backdrop-blur-md shadow-inner">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
              <span>100% Live Gemini API • Real PostgreSQL Backend</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Master Any Skill with{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                Live Gemini Intelligence
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              No pre-written static templates. PathWise conducts an interactive, open-ended intake using live Gemini 2.0 API calls, synthesizes tailored multi-stage curricula for any domain on the fly, and persists everything to a real PostgreSQL database.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartOnboarding}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-base shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition duration-200 cursor-pointer flex items-center justify-center gap-3 group"
              >
                <span>Talk to Live AI Architect</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition duration-200" />
              </button>
            </div>

            {/* Trust Metrics */}
            <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-8 text-xs text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Zero Hardcoded Fallbacks</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" />
                <span>Real PostgreSQL Persistence</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span>Backend-Secured Gemini API Key</span>
              </div>
            </div>

          </div>

          {/* RIGHT HERO INTERACTIVE PREVIEW CARD */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-indigo-500/30 via-slate-800/50 to-cyan-500/20 shadow-2xl shadow-indigo-950/80">
              <div className="bg-slate-950/90 backdrop-blur-2xl rounded-[22px] p-6 border border-slate-800/80 space-y-5">
                
                {/* Simulated Chat Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-cyan-300">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        PathWise AI Architect
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                      </div>
                      <div className="text-[11px] text-slate-400">Live Request-Time Synthesis</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                    gemini-2.0-flash
                  </span>
                </div>

                {/* API Status Notice */}
                {!isGeminiReady && (
                  <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-[11px] text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      🔑 GEMINI_API_KEY Required in .env
                    </div>
                    <p className="text-amber-400/90">
                      Open <code>.env</code> in the project directory and paste your real Google Gemini API Key.
                    </p>
                  </div>
                )}

                {/* Simulated Chat Dialogue */}
                <div className="space-y-3 font-sans text-xs">
                  <div className="flex justify-end">
                    <div className="bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[88%] leading-relaxed">
                      "I want to master 3D Game Physics with Godot and C# in 10 hours a week."
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-slate-900/90 text-slate-200 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[92%] leading-relaxed space-y-2">
                      <p className="text-cyan-300 font-medium">
                        ✨ Live Gemini synthesis for Game Development (Godot + C#):
                      </p>
                      <ul className="text-[11px] text-slate-300 space-y-1.5 pl-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Stage 1: Godot 4.x Primitives & C# Scripting Basics
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          Stage 2: 3D Vector Math & RigidBody Physics
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          Stage 3: Custom Shaders & Multi-threaded Optimization
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Synthesis Progress */}
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-cyan-400" /> PostgreSQL Persistence
                    </span>
                    <span className="text-emerald-400 font-bold">100% Live Call</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full w-full animate-pulse"></div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={onStartOnboarding}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Start Live AI Conversation
                </button>

              </div>
            </div>
          </div>

        </div>

        {/* FEATURE HIGHLIGHTS GRID */}
        <div className="mt-24 pt-12 border-t border-slate-800/80">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Pure Live AI Execution • Zero Mocking
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every single recommendation, explanation, prerequisite calculation, and question is generated dynamically at request time by Google Gemini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition duration-300">
                <Bot className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Live Request-Time AI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No pre-written scripts or switch cases. Ask questions from any field—Robotics, BioInformatics, Game Dev, or Distributed Systems—and receive real answers.
              </p>
            </div>

            <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-6 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-300">
                <Database className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-bold text-white">PostgreSQL Data Layer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Learner records, custom course catalogs, milestones, and item completion statuses are safely stored in relational database tables.
              </p>
            </div>

            <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 rounded-3xl p-6 transition duration-300 space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-violet-950/80 border border-violet-800/50 flex items-center justify-center text-violet-400 group-hover:scale-110 transition duration-300">
                <Zap className="h-6 w-6 text-violet-300" />
              </div>
              <h3 className="text-lg font-bold text-white">Adaptive Live Re-ranking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Feedback buttons trigger live Gemini prompts to re-evaluate prerequisite readiness, insert foundational bridges, or unlock advanced alternatives.
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>PathWise AI • Powered live by Google Gemini 2.0 Flash & PostgreSQL</span>
          </div>
          <div className="flex gap-6">
            <button onClick={onStartOnboarding} className="hover:text-slate-300 transition cursor-pointer">
              Live AI Chat Architect
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
