import { useState } from 'react';
import { Settings, Save, AlertTriangle, RefreshCw, Plus, X, Bot, ShieldCheck } from 'lucide-react';
import type { User, ExperienceLevel, Course } from '../types';

interface ProfileSettingsProps {
  user: User;
  courses: Course[];
  onUpdateProfile: (updatedUser: User) => void;
  onRegeneratePath: () => void;
  onRestartChatIntake?: () => void;
}

export default function ProfileSettings({ 
  user, 
  courses,
  onUpdateProfile, 
  onRegeneratePath,
  onRestartChatIntake 
}: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(user.experience_level);
  const [timeBudget, setTimeBudget] = useState(user.time_budget_hours_per_week);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [interestInput, setInterestInput] = useState('');
  const [completed, setCompleted] = useState<string[]>(user.completed_courses);

  const domain = user.goal_tags[0] || 'Software Engineering';
  const domainCourses = courses.filter(c => c.domain === domain || domain.includes(c.domain) || c.domain.includes(domain));
  const displayCourses = domainCourses.length > 0 ? domainCourses : courses.slice(0, 10);

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleToggleCompleted = (courseId: string) => {
    if (completed.includes(courseId)) {
      setCompleted(completed.filter(id => id !== courseId));
    } else {
      setCompleted([...completed, courseId]);
    }
  };

  const handleSave = () => {
    const updatedUser: User = {
      ...user,
      name,
      email,
      experience_level: experienceLevel,
      time_budget_hours_per_week: Number(timeBudget),
      interests,
      completed_courses: completed
    };
    onUpdateProfile(updatedUser);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            Learning Profile & Backend Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Adjust your pace, experience level, goal targets, and review SQLite (pathwise.db) / Supabase database state.
          </p>
        </div>

        {onRestartChatIntake && (
          <button
            onClick={onRestartChatIntake}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" /> Re-chat with AI Architect
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PROFILE SETTINGS COLUMN */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white">Learner Credentials</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Experience Level
                </label>
                <select 
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value as ExperienceLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Time Budget (hrs/wk)
                </label>
                <input 
                  type="number" 
                  value={timeBudget}
                  onChange={e => setTimeBudget(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* BACKEND SECURITY BADGE */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-200">Backend-Secured Gemini API</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Your API Key is read directly from <code>GEMINI_API_KEY</code> on the backend in <code>.env</code>. It is never transmitted to or stored on the client.
                </p>
              </div>
            </div>

            {/* INTEREST TAGS */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Emphasized Tech / Topics
              </label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  placeholder="Add technology or topic (e.g. Godot, C#, Next.js)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleAddInterest}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl text-xs transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {interests.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[11px] bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 px-2.5 py-1 rounded-lg">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveInterest(tag)}
                      className="hover:text-rose-400 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition cursor-pointer text-xs"
              >
                <Save className="h-4 w-4" /> Save Profile to Database
              </button>
            </div>

          </div>
        </div>

        {/* COMPLETED COURSES & REGENERATION COLUMN */}
        <div className="space-y-8">
          
          {/* PATH REGENERATION WARNING CARD */}
          <div className="bg-slate-900/40 border border-slate-800/85 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Regenerate Roadmap via Gemini</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Completely trigger a fresh live Gemini generation for your goal. 
              Warning: This will overwrite your current stages in the database and reset item completions.
            </p>
            <button
              onClick={onRegeneratePath}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer text-xs"
            >
              <RefreshCw className="h-4 w-4 animate-spin-slow" /> Re-trigger Live Gemini Generator
            </button>
          </div>

          {/* COMPLETED CHECKBOXES */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Database Course Catalog</h3>
            <p className="text-xs text-slate-400">
              Toggle courses completed elsewhere to update SQLite / Supabase and unlock downstream prerequisites.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {displayCourses.map(course => {
                const isDone = completed.includes(course.id);
                return (
                  <label 
                    key={course.id}
                    className={`flex items-start gap-3 p-3 bg-slate-950/80 border rounded-xl cursor-pointer hover:border-slate-700 transition ${
                      isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleCompleted(course.id)}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{course.title}</div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">{course.type} • {course.difficulty}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
