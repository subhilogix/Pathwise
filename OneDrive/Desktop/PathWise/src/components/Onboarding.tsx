import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  User as UserIcon, 
  Clock, 
  ArrowRight, 
  Compass, 
  Brain, 
  RefreshCw,
  Zap,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import type { User, LearningPath, Course } from '../types';
import { sendChatMessage, generateLearningPathAPI } from '../services/apiClient';

interface OnboardingProps {
  onComplete: (user: User, generatedPath: LearningPath, generatedCourses: Course[]) => void;
  onBackToWelcome?: () => void;
}

interface DisplayMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  options?: string[];
  timestamp: Date;
}

export default function Onboarding({ onComplete, onBackToWelcome }: OnboardingProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "Hello! I'm your **PathWise AI Learning Architect** powered live by Gemini. Tell me: **What are you hoping to learn, build, or achieve?** (e.g. *'I want to build full stack apps with Next.js'*, *'I am a mechanical engineer with basic Python and want to learn 3D Game Dev with Godot and C#'*, or *'I want to learn LLM fine-tuning & RAG in 4 months'*).",
      options: [
        'Build Full-Stack Web Apps with React & Node',
        'Learn AI / Machine Learning & LLM Agents',
        'Game Development with Godot & C#',
        'Cloud Architecture & DevOps with Docker & AWS'
      ],
      timestamp: new Date()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Profile data being dynamically synthesized
  const [profile, setProfile] = useState<User>({
    id: `user-${Date.now()}`,
    name: 'Learner',
    email: 'learner@pathwise.edu',
    goal: '',
    goal_tags: ['Software Engineering'],
    experience_level: 'beginner',
    time_budget_hours_per_week: 10,
    interests: [],
    completed_courses: [],
    skill_vector: []
  });

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || isTyping || isGeneratingPath) return;

    setErrorMessage(null);

    // Add user message
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date()
    };

    const newDisplayMessages = [...messages, userMsg];
    setMessages(newDisplayMessages);
    setInputValue('');
    setIsTyping(true);

    // If user clicked generate directly
    if (messageText.toLowerCase().includes('generate my custom ai roadmap') || messageText.toLowerCase().includes('generate ai roadmap')) {
      setIsTyping(false);
      handleGenerateRoadmap();
      return;
    }

    // Convert display messages to API format
    const apiMessages = newDisplayMessages.map(m => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text
    }));

    try {
      const response = await sendChatMessage(apiMessages, profile);

      // Update synthesized profile with any newly detected parameters from live Gemini
      if (response.extractedProfile) {
        const ext = response.extractedProfile as any;
        setProfile(prev => ({
          ...prev,
          goal: ext.goal || prev.goal || messageText,
          goal_tags: ext.domain ? [ext.domain] : ext.goal_tags || prev.goal_tags,
          experience_level: ext.experience_level || prev.experience_level,
          time_budget_hours_per_week: ext.time_budget_hours_per_week || prev.time_budget_hours_per_week,
          interests: ext.interests?.length ? ext.interests : prev.interests
        }));
      }

      const aiMsg: DisplayMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        options: response.suggestedOptions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Error during live Gemini chat:', err);
      setErrorMessage(err.message || 'Gemini API call failed.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setErrorMessage(null);
    setIsGeneratingPath(true);

    const activeGoal = profile.goal || (messages.find(m => m.sender === 'user')?.text) || 'Master Software Engineering';
    const activeDomain = profile.goal_tags[0] || 'Software Engineering';

    const finalProfile: User = {
      ...profile,
      goal: activeGoal,
      goal_tags: [activeDomain]
    };

    try {
      // Live Gemini API call to synthesize bespoke curriculum
      const result = await generateLearningPathAPI(finalProfile);

      // Transition to main dashboard & roadmap with real PostgreSQL/Gemini data
      onComplete(result.user, result.learningPath, result.generatedCourses);
    } catch (err: any) {
      console.error('Roadmap generation failed:', err);
      setErrorMessage(err.message || 'Failed to generate curriculum with live Gemini API.');
      setIsGeneratingPath(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#070b13] text-slate-100 selection:bg-indigo-500 selection:text-white">
      
      {/* LEFT CHAT / WORKSPACE PANEL */}
      <div className="flex-1 flex flex-col p-4 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/40">
        
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {onBackToWelcome && (
              <button
                onClick={onBackToWelcome}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Back to Welcome Page"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PathWise <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">Live Gemini AI Intake</span>
              </h1>
              <p className="text-xs text-slate-400">100% Live Gemini API • Real PostgreSQL Persistence</p>
            </div>
          </div>
        </div>

        {/* VISIBLE ERROR BANNER (NO SILENT FALLBACKS) */}
        {errorMessage && (
          <div className="mb-4 bg-rose-950/80 border border-rose-700/80 text-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-xl animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-rose-300">Gemini API Error</div>
              <p className="leading-relaxed">{errorMessage}</p>
              <p className="text-[11px] text-rose-400 mt-1">
                Please make sure your <strong>GEMINI_API_KEY</strong> is set in the <code>.env</code> file in the project directory and the backend server is running.
              </p>
            </div>
          </div>
        )}

        {/* CONVERSATIONAL AI CHAT INTERFACE */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Scrollable Chat Window */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 max-h-[58vh] sm:max-h-[64vh] scrollbar-thin">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    msg.sender === 'ai' 
                      ? 'bg-indigo-900/60 text-cyan-300 border border-indigo-700/40' 
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-700/40'
                  }`}>
                    {msg.sender === 'ai' ? <Brain className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col gap-2.5">
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border whitespace-pre-line ${
                      msg.sender === 'ai' 
                        ? 'bg-slate-900/90 border-slate-800/90 text-slate-200 shadow-lg' 
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-500/40 text-white shadow-lg'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Interactive Suggestion Chips */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleSend(opt)}
                            disabled={isTyping || isGeneratingPath}
                            className="text-xs bg-slate-900/80 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/40 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full transition duration-200 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3 text-cyan-400" />
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-cyan-400">
                    <Brain className="h-4 w-4 animate-spin-slow" />
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-100"></span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200"></span>
                    <span className="text-xs text-slate-400 ml-1">Calling live Gemini 2.0 API...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="pt-4 border-t border-slate-800/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2 relative"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask any question or specify your learning goals..."
                disabled={isTyping || isGeneratingPath}
                className="flex-1 bg-slate-900/90 border border-slate-700/80 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping || isGeneratingPath}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition duration-200 cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* RIGHT REAL-TIME BLUEPRINT SYNTHESIS SIDEBAR */}
      <div className="w-full lg:w-96 p-6 sm:p-8 bg-slate-950/80 border-t lg:border-t-0 border-slate-800/80 flex flex-col justify-between space-y-6">
        
        <div className="space-y-6">
          {/* Blueprint Title */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span>Live Profile Blueprint</span>
            </div>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Gemini Live
            </span>
          </div>

          {/* Extracted Fields */}
          <div className="space-y-4">
            
            {/* Goal Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-indigo-400" /> Target Goal
              </div>
              <div className="text-sm font-semibold text-white">
                {profile.goal ? `"${profile.goal}"` : <span className="text-slate-500 italic">Listening to chat...</span>}
              </div>
            </div>

            {/* Domain & Level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Domain Track
                </div>
                <div className="text-xs font-bold text-cyan-300 truncate">
                  {profile.goal_tags[0] || 'Auto-detecting...'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Skill Level
                </div>
                <div className="text-xs font-bold text-indigo-300 capitalize">
                  {profile.experience_level}
                </div>
              </div>
            </div>

            {/* Time Commitment */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-slate-300 font-medium">Weekly Time Budget:</span>
              </div>
              <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                {profile.time_budget_hours_per_week} hrs/week
              </span>
            </div>

            {/* Topics / Interests Identified */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Key Technologies & Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-indigo-950/70 border border-indigo-800/50 text-indigo-200 px-2.5 py-1 rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 4-Stage Structure Preview */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> 4-Stage Structure
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span> 1. Foundations & Primitives
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> 2. Core Competencies & Architecture
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span> 3. Applied Real-World Systems
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 4. Flagship Capstone Portfolio
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* GENERATE ROADMAP CTA */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleGenerateRoadmap}
            disabled={isGeneratingPath || isTyping}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPath ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Calling Gemini API & Saving to DB...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <span>Generate Custom AI Roadmap</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500">
            Roadmap adapts dynamically as you complete or skip modules.
          </p>
        </div>

      </div>

    </div>
  );
}
