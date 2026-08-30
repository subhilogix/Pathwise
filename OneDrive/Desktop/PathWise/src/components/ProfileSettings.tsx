import { useState } from 'react';
import { Settings, Save, AlertTriangle, RefreshCw, Plus, X } from 'lucide-react';
import type { User, ExperienceLevel } from '../types';
import { MOCK_COURSES } from '../mockData';


interface ProfileSettingsProps {
  user: User;
  onUpdateProfile: (updatedUser: User) => void;
  onRegeneratePath: () => void;
}

export default function ProfileSettings({ user, onUpdateProfile, onRegeneratePath }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(user.experience_level);
  const [timeBudget, setTimeBudget] = useState(user.time_budget_hours_per_week);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [interestInput, setInterestInput] = useState('');
  const [completed, setCompleted] = useState<string[]>(user.completed_courses);

  const domain = user.goal_tags[0] || 'Web Dev';
  // Filter courses from our domain that can be marked complete manually
  const domainCourses = MOCK_COURSES.filter(c => c.domain === domain);

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
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-indigo-400" /> Profiler & Path Customization
        </h2>
        <p className="text-xs text-slate-400">
          Refine your background profile, add custom interests, or toggle completed courses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PROFILE SETTINGS FORM */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white">General Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Difficulty Preference</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 cursor-pointer"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Weekly Time Budget (Hours)</label>
              <input
                type="number"
                min={1}
                value={timeBudget}
                onChange={(e) => setTimeBudget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>
          </div>

          {/* INTERESTS CHIPS BUILDER */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Focus Topics</label>
            <form onSubmit={handleAddInterest} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add custom topic (e.g. Next.js, PyTorch)..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 rounded-xl transition cursor-pointer flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {interests.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="flex items-center gap-1.5 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded"
                >
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
              className="flex items-center gap-2 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Changes
            </button>
          </div>
        </div>

        {/* COMPLETED COURSES & REGENERATION COLUMN */}
        <div className="space-y-8">
          
          {/* PATH REGENERATION WARNING CARD */}
          <div className="bg-slate-900/40 border border-slate-800/85 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Regenerate Roadmap</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you have significantly altered your learning goal or target domain, you can completely rebuild a fresh path. 
              Warning: This will overwrite your current stages and reset completed items.
            </p>
            <button
              onClick={onRegeneratePath}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 animate-spin-slow" /> Re-trigger AI Generator
            </button>
          </div>

          {/* COMPLETED CHECKBOXES */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Manual Course Toggles</h3>
            <p className="text-xs text-slate-400">
              Toggle courses you have already completed elsewhere to unlock downstream topics.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {domainCourses.map(course => {
                const isDone = completed.includes(course.id);
                return (
                  <label 
                    key={course.id}
                    className={`flex items-start gap-3 p-3 bg-slate-950/80 border rounded-xl cursor-pointer hover:border-slate-700 transition ${
                      isDone ? 'border-emerald-500/20 bg-emerald-500/2' : 'border-slate-850'
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
