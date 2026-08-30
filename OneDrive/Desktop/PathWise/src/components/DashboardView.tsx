import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { Award, BookOpen, Activity, Zap } from 'lucide-react';
import type { LearningPath, User, FeedbackEvent, Course } from '../types';
import { MOCK_COURSES } from '../mockData';


interface DashboardViewProps {
  user: User;
  learningPath: LearningPath;
  feedbackLog: FeedbackEvent[];
  onStartItem: (itemId: string) => void;
  onCompleteItem: (itemId: string) => void;
}

export default function DashboardView({ 
  user, 
  learningPath, 
  feedbackLog, 
  onStartItem, 
  onCompleteItem 
}: DashboardViewProps) {

  const courseMap = new Map<string, Course>();
  MOCK_COURSES.forEach(c => courseMap.set(c.id, c));

  // 1. Progress stats
  const allItems = learningPath.stages.flatMap(s => s.items);
  const completedItems = allItems.filter(item => item.status === 'completed');
  const totalCount = allItems.length;
  const completedCount = completedItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 2. Next recommended actions (Pick up to 3 available or in_progress items)
  const nextActions = allItems
    .filter(item => item.status === 'available' || item.status === 'in_progress')
    .slice(0, 3);

  // 3. Prepare data for Recharts BarChart (Skill growth: Initial vs Current)
  // Let's compare starting level (based on experience level) vs current
  let startingProf = 10;
  if (user.experience_level === 'intermediate') startingProf = 40;
  if (user.experience_level === 'advanced') startingProf = 70;

  const chartData = user.skill_vector.map(sv => {
    // Current is saved in user.skill_vector
    // Let's compute initial as a mock starting value
    let initial = startingProf;
    if (sv.skill === 'HTML' || sv.skill === 'Python' || sv.skill === 'Linux') {
      initial = Math.min(startingProf + 20, 100);
    } else if (sv.skill === 'React' || sv.skill === 'LLMs' || sv.skill === 'Kubernetes') {
      initial = Math.max(0, startingProf - 20);
    }
    return {
      name: sv.skill,
      'Baseline': initial,
      'Current Proficiency': sv.proficiency
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Overview & Actions */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Path Completion</div>
              <div className="text-lg font-bold text-white mt-0.5">{progressPercent}%</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Time Budget</div>
              <div className="text-lg font-bold text-white mt-0.5">{user.time_budget_hours_per_week}h/week</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <Zap className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Adaptive Actions</div>
              <div className="text-lg font-bold text-white mt-0.5">{feedbackLog.length} Swaps</div>
            </div>
          </div>
        </div>

        {/* SKILL GRAPH */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Skill Proficiency Growth</h3>
              <p className="text-xs text-slate-400">Comparing your baseline vs current skills profile</p>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">Live Profiler</span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Baseline" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Current Proficiency" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Skills mapping loading...
              </div>
            )}
          </div>
        </div>

        {/* NEXT RECOMMENDED ACTIONS */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Next Up In Your Roadmap</h3>
            <p className="text-xs text-slate-400">Jump back in to continue unlocking downstream courses</p>
          </div>

          <div className="space-y-3">
            {nextActions.length > 0 ? (
              nextActions.map(action => {
                const course = courseMap.get(action.course_id);
                if (!course) return null;

                return (
                  <div 
                    key={action.course_id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-indigo-400 font-semibold uppercase">
                          {course.type}
                        </span>
                        <span className="text-xs text-slate-500">{course.estimated_hours} hrs</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{course.title}</h4>
                    </div>

                    <div className="flex gap-2">
                      {action.status === 'in_progress' ? (
                        <button
                          onClick={() => onCompleteItem(course.id)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-3 rounded-lg shadow-md transition cursor-pointer"
                        >
                          Complete
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartItem(course.id)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 px-3 rounded-lg shadow-md transition cursor-pointer"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                You've completed or skipped all available actions in this stage!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Adaptation Log & Milestones */}
      <div className="space-y-8">
        
        {/* MILESTONES CARD */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" /> Milestone Tracking
            </h3>
            <p className="text-xs text-slate-400">Track and unlock rewards on completion</p>
          </div>

          <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
            {learningPath.stages.map((stage, sIdx) => {
              const stageItems = stage.items;
              const isStageDone = stageItems.every(item => item.status === 'completed' || item.status === 'skipped');
              const isStageActive = !isStageDone && stageItems.some(item => item.status === 'in_progress' || item.status === 'available');

              return (
                <div key={sIdx} className="flex gap-4 relative">
                  {/* Step node */}
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 z-10 ${
                    isStageDone 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : isStageActive
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}>
                    {sIdx + 1}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isStageDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                      {stage.title}
                    </h4>
                    <span className="text-[10px] text-indigo-400 block mt-0.5">
                      Milestone: {stage.milestone}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {stageItems.filter(i => i.status === 'completed').length} / {stageItems.length} complete
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ADAPTIVITY LOG CARD */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" /> Adaptation Log
            </h3>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded uppercase font-semibold">Active</span>
          </div>
          <p className="text-xs text-slate-400">
            PathWise engine logs adjustments here to show transparency in customization.
          </p>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {feedbackLog.length > 0 ? (
              feedbackLog.map((log, index) => (
                <div key={log.id || index} className="p-3 bg-slate-950/80 border border-slate-800/50 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span className="font-semibold text-slate-400">{log.feedback_type.replace('_', ' ').toUpperCase()}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {log.resulting_action}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-600 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                No adaptation events logged yet. Try giving feedback on a roadmap item!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
