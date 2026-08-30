import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Compass, 
  Settings, 
  LogOut, 
  Sparkles, 
  Bot, 
  AlertTriangle,
  Database,
  Key
} from 'lucide-react';
import WelcomePage from './components/WelcomePage';
import Onboarding from './components/Onboarding';
import RoadmapView from './components/RoadmapView';
import DashboardView from './components/DashboardView';
import FloatingAssistant from './components/FloatingAssistant';
import ProfileSettings from './components/ProfileSettings';
import type { User, LearningPath, FeedbackEvent, PathItem, FeedbackType, Course } from './types';
import { 
  checkHealth, 
  fetchUserData, 
  updateItemStatusAPI, 
  adaptPathAPI
} from './services/apiClient';
import type { HealthStatus } from './services/apiClient';
import { updatePathLocksAndCompleted } from './engine';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [feedbackLog, setFeedbackLog] = useState<FeedbackEvent[]>([]);
  const [currentView, setCurrentView] = useState<'welcome' | 'chat' | 'app'>('welcome');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roadmap' | 'settings'>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check health and load saved user from PostgreSQL on startup
  useEffect(() => {
    async function init() {
      try {
        const h = await checkHealth();
        setHealth(h);
      } catch (err: any) {
        console.warn('Backend health check failed:', err);
        setHealth({ ok: false, geminiConfigured: false, dbConnected: false });
      }

      const savedUserId = localStorage.getItem('pw_user_id');
      if (savedUserId) {
        try {
          const data = await fetchUserData(savedUserId);
          if (data.user && data.learningPath) {
            setUser(data.user);
            setLearningPath(data.learningPath);
            setCourses(data.allCourses || []);
            setFeedbackLog(data.feedbackLog || []);
            setCurrentView('app');
            return;
          }
        } catch (err) {
          console.warn('Failed to load user from PostgreSQL:', err);
        }
      }

      setCurrentView('welcome');
    }

    init();
  }, []);

  const handleCompleteOnboarding = (
    newUser: User, 
    newPath: LearningPath, 
    newCourses: Course[]
  ) => {
    localStorage.setItem('pw_user_id', newUser.id);
    setUser(newUser);
    setLearningPath(newPath);
    setCourses(newCourses);
    setFeedbackLog([]);
    setCurrentView('app');
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    if (!learningPath) return;
    setUser(updatedUser);

    try {
      await fetch(`/api/user/${encodeURIComponent(updatedUser.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedUser })
      });

      // Recalculate locks locally based on updated completed list and courses
      const updatedPath = updatePathLocksAndCompleted(learningPath, updatedUser.completed_courses, courses);
      setLearningPath(updatedPath);
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleRegeneratePath = () => {
    if (!user) return;
    const confirm = window.confirm("Regenerate roadmap via live Gemini API? This will reset current stage progress.");
    if (confirm) {
      setCurrentView('chat');
    }
  };

  const handleItemStatusChange = async (itemId: string, newStatus: PathItem['status']) => {
    if (!user || !learningPath) return;

    try {
      // 1. Send update to PostgreSQL backend
      await updateItemStatusAPI(itemId, user.id, newStatus);

      let updatedCompleted = [...user.completed_courses];
      let updatedSkillVector = [...user.skill_vector];

      if (newStatus === 'completed' && !updatedCompleted.includes(itemId)) {
        updatedCompleted.push(itemId);
        
        const course = courses.find(c => c.id === itemId);
        if (course?.skills_taught) {
          course.skills_taught.forEach(skill => {
            const existing = updatedSkillVector.find(sv => sv.skill === skill);
            if (existing) {
              existing.proficiency = Math.min(existing.proficiency + 20, 100);
            } else {
              updatedSkillVector.push({ skill, proficiency: 40 });
            }
          });
        }
      }

      const updatedUser = {
        ...user,
        completed_courses: updatedCompleted,
        skill_vector: updatedSkillVector
      };

      const updatedStages = learningPath.stages.map(stage => ({
        ...stage,
        items: stage.items.map(item => {
          if (item.course_id === itemId) {
            return { ...item, status: newStatus };
          }
          return item;
        })
      }));

      const tempPath = { ...learningPath, stages: updatedStages };
      const updatedPath = updatePathLocksAndCompleted(tempPath, updatedCompleted, courses);

      setUser(updatedUser);
      setLearningPath(updatedPath);
    } catch (err: any) {
      setApiError(err.message || 'Failed to update item status in database.');
    }
  };

  const handleFeedback = async (itemId: string, feedback: FeedbackType) => {
    if (!user || !learningPath) return;

    try {
      // Call backend live Gemini adapt-path endpoint
      const result = await adaptPathAPI(user.id, itemId, feedback, user, learningPath);

      setUser(result.updatedUser);
      setLearningPath(result.updatedPath);

      const newLog: FeedbackEvent = {
        id: `evt-${Date.now()}`,
        user_id: user.id,
        path_item_id: itemId,
        feedback_type: feedback,
        timestamp: new Date().toISOString(),
        resulting_action: result.actionMessage
      };

      setFeedbackLog(prev => [newLog, ...prev]);
    } catch (err: any) {
      setApiError(err.message || 'Failed to adapt path with live Gemini API.');
    }
  };

  const handleApplyPathChange = (changeType: string, payload: any) => {
    if (changeType === 'SKIP_ITEM') {
      handleFeedback(payload.itemId, 'skip');
    } else if (changeType === 'UPDATE_TIME_BUDGET') {
      if (!user) return;
      handleUpdateProfile({ ...user, time_budget_hours_per_week: payload.hours });
    }
  };

  const handleResetApp = () => {
    const confirm = window.confirm("Reset active profile and return to welcome page?");
    if (confirm) {
      localStorage.removeItem('pw_user_id');
      setUser(null);
      setLearningPath(null);
      setCourses([]);
      setFeedbackLog([]);
      setCurrentView('welcome');
    }
  };

  // 1. WELCOME VIEW
  if (currentView === 'welcome') {
    return (
      <WelcomePage 
        onStartOnboarding={() => setCurrentView('chat')}
        hasExistingPath={!!user && !!learningPath}
        onContinueToDashboard={() => setCurrentView('app')}
        health={health}
      />
    );
  }

  // 2. CONVERSATIONAL AI ONBOARDING CHAT
  if (currentView === 'chat' || (!user || !learningPath)) {
    return (
      <Onboarding 
        onComplete={handleCompleteOnboarding}
        onBackToWelcome={() => setCurrentView('welcome')}
      />
    );
  }

  // 3. MAIN DASHBOARD / ROADMAP APPLICATION VIEW
  const allItems = learningPath.stages.flatMap(s => s.items);
  const doneCount = allItems.filter(item => item.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* PERSISTENT API KEY WARNING BANNER IF MISSING */}
      {health && !health.geminiConfigured && (
        <div className="bg-amber-950/90 border-b border-amber-800 px-6 py-3 text-amber-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Action Required:</strong> <code>GEMINI_API_KEY</code> is not set in your <code>.env</code> file. Live Gemini recommendations and Q&A will fail until you paste your key in <code>.env</code>.
            </span>
          </div>
        </div>
      )}

      {/* VISIBLE ERROR BANNER */}
      {apiError && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-6 py-3 text-rose-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-rose-400 hover:text-white cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* GLOBAL APPLICATION HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('welcome')}
              className="p-2 bg-gradient-to-tr from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 rounded-xl shadow-md transition cursor-pointer"
              title="Return to Welcome Landing"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                PathWise <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-normal">Gemini Live</span>
              </h1>
              <p className="text-[10px] text-slate-400">PostgreSQL Backed • Live AI Engine</p>
            </div>
          </div>

          {/* User Status Bar & View Switchers */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs">
            <div className="text-slate-400 hidden md:block">
              Goal: <span className="text-white font-medium italic">"{user.goal.length > 30 ? user.goal.substring(0, 30) + '...' : user.goal}"</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden md:block"></div>
            <div className="text-slate-400">
              Completed: <span className="text-emerald-400 font-bold">{doneCount} / {allItems.length}</span>
            </div>
            
            <div className="w-[1px] h-3 bg-slate-800"></div>
            
            <button
              onClick={() => setCurrentView('chat')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 font-medium"
              title="Re-open conversational AI chat intake"
            >
              <Bot className="h-3.5 w-3.5" /> AI Chat
            </button>

            <button 
              onClick={handleResetApp}
              className="text-slate-500 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 font-medium ml-1"
              title="Reset profile"
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
            <Settings className="h-4 w-4" /> Profiler & DB Settings
          </button>
        </div>

        {/* Tab content renders here */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardView 
              user={user}
              learningPath={learningPath}
              courses={courses}
              feedbackLog={feedbackLog}
              onStartItem={(id) => handleItemStatusChange(id, 'in_progress')}
              onCompleteItem={(id) => handleItemStatusChange(id, 'completed')}
            />
          )}

          {activeTab === 'roadmap' && (
            <RoadmapView 
              learningPath={learningPath}
              courses={courses}
              onItemStatusChange={handleItemStatusChange}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === 'settings' && (
            <ProfileSettings 
              user={user}
              courses={courses}
              onUpdateProfile={handleUpdateProfile}
              onRegeneratePath={handleRegeneratePath}
              onRestartChatIntake={() => setCurrentView('chat')}
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
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>PathWise • Live Gemini 2.0 API & PostgreSQL Architecture</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setCurrentView('welcome')} className="hover:text-slate-400 transition cursor-pointer">
              Home Landing
            </button>
            <span>•</span>
            <button onClick={() => setCurrentView('chat')} className="hover:text-slate-400 transition cursor-pointer">
              AI Chat Architect
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('settings')} className="hover:text-slate-400 transition cursor-pointer">
              Database Profiler
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
