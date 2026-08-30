import { useState, useEffect } from 'react';
import { LayoutDashboard, Compass, Settings, LogOut, Sparkles } from 'lucide-react';
import Onboarding from './components/Onboarding';
import RoadmapView from './components/RoadmapView';
import DashboardView from './components/DashboardView';
import FloatingAssistant from './components/FloatingAssistant';
import ProfileSettings from './components/ProfileSettings';
import type { User, LearningPath, FeedbackEvent, PathItem, FeedbackType } from './types';
import { generateLearningPath, updatePathLocksAndCompleted, adaptPath } from './engine';
import { MOCK_COURSES } from './mockData';


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [feedbackLog, setFeedbackLog] = useState<FeedbackEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roadmap' | 'settings'>('dashboard');

  // Load from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('pw_user');
    const savedPath = localStorage.getItem('pw_path');
    const savedFeedback = localStorage.getItem('pw_feedback');

    if (savedUser && savedPath) {
      setUser(JSON.parse(savedUser));
      setLearningPath(JSON.parse(savedPath));
      if (savedFeedback) {
        setFeedbackLog(JSON.parse(savedFeedback));
      }
    }
  }, []);

  // Save to localStorage whenever states change
  const saveState = (updatedUser: User | null, updatedPath: LearningPath | null, updatedFeedback: FeedbackEvent[]) => {
    if (updatedUser) {
      localStorage.setItem('pw_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } else {
      localStorage.removeItem('pw_user');
      setUser(null);
    }

    if (updatedPath) {
      localStorage.setItem('pw_path', JSON.stringify(updatedPath));
      setLearningPath(updatedPath);
    } else {
      localStorage.removeItem('pw_path');
      setLearningPath(null);
    }

    localStorage.setItem('pw_feedback', JSON.stringify(updatedFeedback));
    setFeedbackLog(updatedFeedback);
  };

  const handleCompleteOnboarding = (newUser: User) => {
    const generatedPath = generateLearningPath(newUser);
    saveState(newUser, generatedPath, []);
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = (updatedUser: User) => {
    if (!learningPath) return;

    // Recalculate locks based on new completed list
    const updatedPath = updatePathLocksAndCompleted(learningPath, updatedUser.completed_courses);
    saveState(updatedUser, updatedPath, feedbackLog);
  };

  const handleRegeneratePath = () => {
    if (!user) return;
    const confirm = window.confirm("Are you sure you want to regenerate your learning path? This will reset all current item completions and progress.");
    if (confirm) {
      const freshUser = { ...user, completed_courses: [] };
      const generatedPath = generateLearningPath(freshUser);
      saveState(freshUser, generatedPath, []);
      setActiveTab('roadmap');
    }
  };

  const handleItemStatusChange = (itemId: string, newStatus: PathItem['status']) => {
    if (!user || !learningPath) return;

    let updatedCompleted = [...user.completed_courses];
    let updatedSkillVector = [...user.skill_vector];

    if (newStatus === 'completed') {
      if (!updatedCompleted.includes(itemId)) {
        updatedCompleted.push(itemId);
      }

      // Add proficiency to skills taught by this course
      const course = MOCK_COURSES.find(c => c.id === itemId);
      if (course) {
        course.skills_taught.forEach(skill => {
          const existingSkill = updatedSkillVector.find(sv => sv.skill === skill);
          if (existingSkill) {
            existingSkill.proficiency = Math.min(existingSkill.proficiency + 20, 100);
          } else {
            updatedSkillVector.push({ skill, proficiency: 40 }); // Starting default for newly gained skill
          }
        });
      }
    }

    // Update item status directly in stages
    const updatedStages = learningPath.stages.map(stage => ({
      ...stage,
      items: stage.items.map(item => {
        if (item.course_id === itemId) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    }));

    const updatedUser = {
      ...user,
      completed_courses: updatedCompleted,
      skill_vector: updatedSkillVector
    };

    const tempPath = { ...learningPath, stages: updatedStages };
    const updatedPath = updatePathLocksAndCompleted(tempPath, updatedCompleted);

    saveState(updatedUser, updatedPath, feedbackLog);
  };

  const handleFeedback = (itemId: string, feedback: FeedbackType) => {
    if (!user || !learningPath) return;

    const { updatedPath, updatedUser, actionMessage } = adaptPath(learningPath, user, itemId, feedback);

    // Create log entry
    const newFeedbackEvent: FeedbackEvent = {
      id: `evt-${Date.now()}`,
      user_id: user.id,
      path_item_id: itemId,
      feedback_type: feedback,
      timestamp: new Date().toISOString(),
      resulting_action: actionMessage
    };

    const updatedFeedbackLog = [newFeedbackEvent, ...feedbackLog];
    saveState(updatedUser, updatedPath, updatedFeedbackLog);
  };

  const handleApplyPathChange = (changeType: string, payload: any) => {
    if (changeType === 'SKIP_ITEM') {
      handleFeedback(payload.itemId, 'skip');
    } else if (changeType === 'UPDATE_TIME_BUDGET') {
      if (!user) return;
      const updatedUser = { ...user, time_budget_hours_per_week: payload.hours };
      saveState(updatedUser, learningPath, feedbackLog);
    }
  };

  const handleResetApp = () => {
    const confirm = window.confirm("Reset all user profile data and configurations?");
    if (confirm) {
      saveState(null, null, []);
      setActiveTab('dashboard');
    }
  };

  // If user profile is not constructed yet, route to Onboarding screen
  if (!user || !learningPath) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  // Calculate quick header stats
  const allItems = learningPath.stages.flatMap(s => s.items);
  const doneCount = allItems.filter(item => item.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-between">
      
      {/* GLOBAL HEADER HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                PathWise <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-normal">Dashboard</span>
              </h1>
              <p className="text-[10px] text-slate-400">Personalized Learning Companion</p>
            </div>
          </div>

          {/* User Status Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs">
            <div className="text-slate-400">
              Goal: <span className="text-white font-medium italic">"{user.goal.length > 35 ? user.goal.substring(0, 35) + '...' : user.goal}"</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden sm:block"></div>
            <div className="text-slate-400">
              Completed: <span className="text-emerald-400 font-bold">{doneCount} / {allItems.length}</span>
            </div>
            <button 
              onClick={handleResetApp}
              className="text-slate-500 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 font-semibold ml-2"
            >
              <LogOut className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8">
        
        {/* TAB NAVIGATION CHIPS */}
        <div className="flex items-center gap-2 mb-8 bg-slate-900/40 p-1.5 rounded-xl border border-slate-850 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Progress Overview
          </button>
          
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'roadmap'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="h-4 w-4" /> Timeline Roadmap
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" /> Profiler Settings
          </button>
        </div>

        {/* Tab content renders here */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardView 
              user={user}
              learningPath={learningPath}
              feedbackLog={feedbackLog}
              onStartItem={(id) => handleItemStatusChange(id, 'in_progress')}
              onCompleteItem={(id) => handleItemStatusChange(id, 'completed')}
            />
          )}

          {activeTab === 'roadmap' && (
            <RoadmapView 
              learningPath={learningPath}
              onItemStatusChange={handleItemStatusChange}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === 'settings' && (
            <ProfileSettings 
              user={user}
              onUpdateProfile={handleUpdateProfile}
              onRegeneratePath={handleRegeneratePath}
            />
          )}
        </div>
      </main>

      {/* FLOATING AI ASSISTANT PANEL */}
      <FloatingAssistant 
        user={user}
        learningPath={learningPath}
        onApplyPathChange={handleApplyPathChange}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 PathWise. Built with state-of-the-art AI personalized recommenders.</div>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 transition cursor-pointer">Help & Documentation</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Feedback Center</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
