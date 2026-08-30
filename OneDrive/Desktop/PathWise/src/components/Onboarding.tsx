import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, User as UserIcon, BookOpen, Clock, Activity, ArrowRight } from 'lucide-react';
import type { User, ExperienceLevel } from '../types';
import { parseGoalWithAI } from '../engine';


interface OnboardingProps {
  onComplete: (user: User) => void;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  options?: string[];
  field?: 'goal' | 'experience' | 'time' | 'interests';
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I'm your PathWise learning companion. What are you hoping to learn, build, or achieve? (e.g., 'I want to build full stack web apps in React', 'I want to learn machine learning with Python')"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Profile data being built in real-time
  const [profile, setProfile] = useState<Partial<User>>({
    name: 'Learner',
    email: 'learner@pathwise.edu',
    goal: '',
    experience_level: 'beginner',
    time_budget_hours_per_week: 10,
    interests: [],
    goal_tags: ['Web Dev'],
    completed_courses: [],
    skill_vector: []
  });

  const [showManualForm, setShowManualForm] = useState(false);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user' as const, text }];
    setMessages(newMessages);
    setInputValue('');

    // Process step
    setTimeout(() => {
      processNextStep(text, newMessages);
    }, 800);
  };

  const processNextStep = (userText: string, currentMessages: Message[]) => {
    const nextStep = step + 1;
    setStep(nextStep);

    if (step === 0) {
      // 1. Goal Input
      const parsed = parseGoalWithAI(userText);
      setProfile(prev => ({
        ...prev,
        goal: userText,
        goal_tags: [parsed.inferredDomain],
        experience_level: parsed.experienceLevel,
        time_budget_hours_per_week: parsed.timeBudget,
        interests: parsed.interests
      }));

      setMessages([
        ...currentMessages,
        {
          sender: 'ai',
          text: `Got it! A path in "${parsed.inferredDomain}" sounds exciting. What is your current experience level in this area?`,
          options: ['Beginner (No coding background)', 'Intermediate (Know syntax, built small projects)', 'Advanced (Experienced developer looking to pivot/learn advanced topics)'],
          field: 'experience'
        }
      ]);
    } else if (step === 1) {
      // 2. Experience Level
      let level: ExperienceLevel = 'beginner';
      if (userText.toLowerCase().includes('intermediate')) level = 'intermediate';
      if (userText.toLowerCase().includes('advanced')) level = 'advanced';

      setProfile(prev => ({ ...prev, experience_level: level }));

      setMessages([
        ...currentMessages,
        {
          sender: 'ai',
          text: "Excellent. How many hours per week can you realistically dedicate to this learning path?",
          options: ['3-5 hours/week', '5-10 hours/week', '10-15 hours/week', '20+ hours/week'],
          field: 'time'
        }
      ]);
    } else if (step === 2) {
      // 3. Time Budget
      let hours = 10;
      const match = userText.match(/(\d+)/);
      if (match) {
        hours = parseInt(match[1], 10);
      } else if (userText.includes('3-5')) {
        hours = 4;
      } else if (userText.includes('5-10')) {
        hours = 8;
      } else if (userText.includes('10-15')) {
        hours = 12;
      } else if (userText.includes('20+')) {
        hours = 25;
      }

      setProfile(prev => ({ ...prev, time_budget_hours_per_week: hours }));

      // Standard topics to choose from based on domain
      const domain = profile.goal_tags?.[0] || 'Web Dev';
      let options = ['React', 'Backend Development', 'API Design'];
      if (domain === 'Data Science') options = ['Data Manipulation', 'Machine Learning', 'SQL Analysis'];
      if (domain === 'AI/ML') options = ['Deep Learning', 'Large Language Models', 'Computer Vision'];
      if (domain === 'Cloud/DevOps') options = ['Docker & Containers', 'CI/CD Pipelines', 'AWS Deployment'];

      setMessages([
        ...currentMessages,
        {
          sender: 'ai',
          text: `Perfect! What are your primary interests or specific technologies you'd like to emphasize? (Select one or type custom ones)`,
          options,
          field: 'interests'
        }
      ]);
    } else if (step === 3) {
      // 4. Interests
      const currentInterests = profile.interests || [];
      if (!currentInterests.includes(userText)) {
        currentInterests.push(userText);
      }

      // Generate initial skill vector
      const domain = profile.goal_tags?.[0] || 'Web Dev';
      const initialSkills = getInitialSkills(domain, profile.experience_level || 'beginner');

      setProfile(prev => ({
        ...prev,
        interests: currentInterests,
        skill_vector: initialSkills
      }));

      setMessages([
        ...currentMessages,
        {
          sender: 'ai',
          text: "I've structured your profile! Click below to build your custom learning path.",
        }
      ]);
    }
  };

  const getInitialSkills = (domain: string, level: ExperienceLevel) => {
    let startingProf = 10;
    if (level === 'intermediate') startingProf = 40;
    if (level === 'advanced') startingProf = 70;

    if (domain === 'Web Dev') {
      return [
        { skill: 'HTML', proficiency: Math.min(startingProf + 20, 100) },
        { skill: 'CSS', proficiency: Math.min(startingProf + 10, 100) },
        { skill: 'JavaScript', proficiency: startingProf },
        { skill: 'React', proficiency: Math.max(0, startingProf - 20) },
        { skill: 'Node.js', proficiency: Math.max(0, startingProf - 30) }
      ];
    } else if (domain === 'Data Science') {
      return [
        { skill: 'Python', proficiency: Math.min(startingProf + 25, 100) },
        { skill: 'Statistics', proficiency: startingProf },
        { skill: 'Pandas', proficiency: Math.max(0, startingProf - 10) },
        { skill: 'Machine Learning', proficiency: Math.max(0, startingProf - 30) }
      ];
    } else if (domain === 'AI/ML') {
      return [
        { skill: 'Python', proficiency: Math.min(startingProf + 20, 100) },
        { skill: 'Neural Networks', proficiency: startingProf },
        { skill: 'Deep Learning', proficiency: Math.max(0, startingProf - 20) },
        { skill: 'LLMs', proficiency: Math.max(0, startingProf - 40) }
      ];
    } else {
      return [
        { skill: 'Linux', proficiency: Math.min(startingProf + 20, 100) },
        { skill: 'Docker', proficiency: startingProf },
        { skill: 'AWS', proficiency: Math.max(0, startingProf - 20) },
        { skill: 'Kubernetes', proficiency: Math.max(0, startingProf - 40) }
      ];
    }
  };

  const handleFinishOnboarding = () => {
    const finalProfile: User = {
      id: profile.id || `user-${Date.now()}`,
      name: profile.name || 'Learner',
      email: profile.email || 'learner@pathwise.edu',
      experience_level: profile.experience_level || 'beginner',
      interests: profile.interests || [],
      goal: profile.goal || 'Learn Web Development',
      goal_tags: profile.goal_tags || ['Web Dev'],
      time_budget_hours_per_week: profile.time_budget_hours_per_week || 10,
      completed_courses: profile.completed_courses || [],
      skill_vector: profile.skill_vector || getInitialSkills(profile.goal_tags?.[0] || 'Web Dev', profile.experience_level || 'beginner')
    };
    onComplete(finalProfile);
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: User = {
      id: `user-${Date.now()}`,
      name: profile.name || 'Learner',
      email: profile.email || 'learner@pathwise.edu',
      experience_level: profile.experience_level || 'beginner',
      interests: profile.interests || [],
      goal: profile.goal || 'Learn Web Development',
      goal_tags: profile.goal_tags || ['Web Dev'],
      time_budget_hours_per_week: Number(profile.time_budget_hours_per_week) || 10,
      completed_courses: profile.completed_courses || [],
      skill_vector: getInitialSkills(profile.goal_tags?.[0] || 'Web Dev', profile.experience_level || 'beginner')
    };
    onComplete(finalProfile);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070b13] text-slate-100">
      
      {/* LEFT PANEL: Chat intake OR Manual Form */}
      <div className="flex-1 flex flex-col p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-6 w-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">PathWise <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-normal">AI Engine v1.0</span></h1>
              <p className="text-xs text-slate-400">Personalized Learning Roadmap Generator</p>
            </div>
          </div>
          <button 
            onClick={() => setShowManualForm(!showManualForm)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4 cursor-pointer"
          >
            {showManualForm ? "Use conversational setup" : "Skip chat & setup manually"}
          </button>
        </div>

        {!showManualForm ? (
          /* CONVERSATIONAL CHAT SCREEN */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Scrollable messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh] md:max-h-[70vh]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === 'ai' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-700/30' : 'bg-cyan-900/50 text-cyan-400 border border-cyan-700/30'
                    }`}>
                      {msg.sender === 'ai' ? <Sparkles className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                        msg.sender === 'ai' 
                          ? 'bg-slate-900/80 border-slate-800 text-slate-100' 
                          : 'bg-indigo-950/80 border-indigo-800/50 text-indigo-100'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Message Options / Clickable Chips */}
                      {msg.options && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => handleSend(opt)}
                              className="text-xs bg-slate-800/80 border border-slate-700 hover:bg-indigo-900/30 hover:border-indigo-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-full transition duration-200 cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              {step > 3 ? (
                /* Generate Button State */
                <div className="flex justify-center p-4">
                  <button
                    onClick={handleFinishOnboarding}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-xl shadow-xl shadow-indigo-500/20 transform hover:-translate-y-0.5 transition cursor-pointer"
                  >
                    Generate my learning path <ArrowRight className="h-5 w-5 animate-pulse" />
                  </button>
                </div>
              ) : (
                /* Form Input */
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe your learning goals..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 shadow-inner"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* MANUAL FORM VIEW */
          <form onSubmit={handleManualFormSubmit} className="flex-1 space-y-6 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Learning Goal</label>
              <textarea
                value={profile.goal || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, goal: e.target.value }))}
                required
                rows={3}
                placeholder="Describe what you want to learn or achieve in detail..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Domain</label>
                <select
                  value={profile.goal_tags?.[0] || 'Web Dev'}
                  onChange={(e) => setProfile(prev => ({ ...prev, goal_tags: [e.target.value] }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 cursor-pointer"
                >
                  <option value="Web Dev">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="AI/ML">Artificial Intelligence</option>
                  <option value="Cloud/DevOps">Cloud & DevOps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Experience Level</label>
                <select
                  value={profile.experience_level || 'beginner'}
                  onChange={(e) => setProfile(prev => ({ ...prev, experience_level: e.target.value as ExperienceLevel }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 cursor-pointer"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Weekly Time Budget (Hours)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={profile.time_budget_hours_per_week || 10}
                onChange={(e) => setProfile(prev => ({ ...prev, time_budget_hours_per_week: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Focus Topics (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. React, Next.js, Docker, Pandas"
                value={profile.interests?.join(', ') || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl transition cursor-pointer"
              >
                Back to Chat
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg transition cursor-pointer"
              >
                Generate Path
              </button>
            </div>
          </form>
        )}
      </div>

      {/* RIGHT PANEL: Live Profile Summary Card */}
      <div className="w-full md:w-80 bg-slate-950 p-6 md:p-10 flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" /> Profiler Summary
          </h2>

          <div className="space-y-6">
            {/* Goal Tag */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">Target Field</span>
              <div className="text-sm font-semibold text-slate-200">
                {profile.goal_tags?.[0] || 'Unselected'}
              </div>
            </div>

            {/* Inferred Goal */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">Learning Goal</span>
              <p className="text-sm font-medium text-slate-300 italic">
                {profile.goal ? `"${profile.goal}"` : 'Awaiting goal description...'}
              </p>
            </div>

            {/* Experience Level */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">Experience Level</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  profile.experience_level === 'beginner' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : profile.experience_level === 'intermediate'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {profile.experience_level}
                </span>
              </div>
            </div>

            {/* Time Budget */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">Time Availability</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Clock className="h-4 w-4 text-slate-400" />
                {profile.time_budget_hours_per_week} hours / week
              </div>
            </div>

            {/* Focus Interests */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">Focus Topics</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {profile.interests && profile.interests.length > 0 ? (
                  profile.interests.map((tag, i) => (
                    <span key={i} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">None selected</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-slate-800 text-xs text-slate-500 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Generating 4-stage roadmaps
          </div>
          <div>All roadmaps are interactive and adapt live to user progress or feedback.</div>
        </div>
      </div>
      
    </div>
  );
}
