import { useState } from 'react';
import { 
  Play, CheckCircle, Lock, Unlock, Sparkles, AlertCircle, X, SkipForward
} from 'lucide-react';
import type { LearningPath, PathItem, Course, FeedbackType } from '../types';
import { MOCK_COURSES } from '../mockData';


interface RoadmapViewProps {
  learningPath: LearningPath;
  onItemStatusChange: (itemId: string, status: PathItem['status']) => void;
  onFeedback: (itemId: string, feedback: FeedbackType) => void;
}

export default function RoadmapView({ learningPath, onItemStatusChange, onFeedback }: RoadmapViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'course' | 'project' | 'assessment'>('all');

  const courseMap = new Map<string, Course>();
  MOCK_COURSES.forEach(c => courseMap.set(c.id, c));

  const selectedItem = selectedItemId ? courseMap.get(selectedItemId) : null;
  const selectedPathItem = selectedItemId 
    ? learningPath.stages.flatMap(s => s.items).find(item => item.course_id === selectedItemId)
    : null;

  // Count progress stats
  const allItems = learningPath.stages.flatMap(s => s.items);
  const completedCount = allItems.filter(item => item.status === 'completed').length;
  const totalCount = allItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8 relative">
      {/* HEADER PROGRESS INFO */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Your Customized Learning Roadmap</h2>
          <p className="text-sm text-slate-400">
            A targeted 4-stage path designed specifically for: <span className="text-indigo-400 font-semibold italic">"{learningPath.goal_snapshot}"</span>
          </p>
        </div>

        {/* Progress Display */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700">
            <span className="text-base font-bold text-white">{progressPercent}%</span>
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin-slow pointer-events-none opacity-30"></div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Progress</div>
            <div className="text-sm text-slate-200 font-medium">
              {completedCount} of {totalCount} items completed
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-2">Filter Type:</span>
          {(['all', 'course', 'project', 'assessment'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer capitalize ${
                filterType === type 
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {type === 'all' ? 'Show All' : `${type}s`}
            </button>
          ))}
        </div>
        
        <div className="text-xs text-slate-400 italic">
          Tip: Click any item card to see explanations and start studying.
        </div>
      </div>

      {/* ROADMAP TIMELINE */}
      <div className="space-y-12 relative before:absolute before:left-4 md:before:left-1/2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800/80">
        
        {learningPath.stages.map((stage, sIdx) => {
          // Filter items based on type selection
          const filteredItems = stage.items.filter(item => {
            const course = courseMap.get(item.course_id);
            if (!course) return false;
            if (filterType === 'all') return true;
            return course.type === filterType;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={sIdx} className="relative space-y-6">
              {/* Stage Node Marker */}
              <div className="flex md:justify-center items-center relative z-10">
                <div className="bg-slate-950 border-2 border-indigo-500/80 px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">Stage {sIdx + 1}: {stage.title}</div>
                  <div className="text-[10px] text-slate-500 font-medium text-center">Milestone: {stage.milestone}</div>
                </div>
              </div>

              {/* Stage items list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {filteredItems.map((item) => {

                  const course = courseMap.get(item.course_id);
                  if (!course) return null;
                  const isLocked = item.status === 'locked';

                  const isCompleted = item.status === 'completed';
                  const isSkipped = item.status === 'skipped';
                  const isInProgress = item.status === 'in_progress';

                  return (
                    <div 
                      key={item.course_id}
                      onClick={() => setSelectedItemId(item.course_id)}
                      className={`group relative bg-slate-900/60 hover:bg-slate-900 border rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                        isCompleted 
                          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                          : isSkipped
                          ? 'border-slate-800/60 opacity-60'
                          : isInProgress
                          ? 'border-indigo-500 shadow-lg shadow-indigo-500/5'
                          : isLocked
                          ? 'border-slate-800 hover:border-slate-700 opacity-80'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Card Header Status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {/* Type badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              course.type === 'course' 
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : course.type === 'project'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {course.type}
                            </span>
                            
                            {/* Difficulty */}
                            <span className="text-[10px] text-slate-500 font-medium">
                              • {course.difficulty}
                            </span>
                          </div>

                          {/* Status Icon */}
                          <div className={`p-1.5 rounded-lg border ${
                            isCompleted 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : isSkipped
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : isInProgress
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse'
                              : isLocked
                              ? 'bg-slate-900 border-slate-800 text-slate-600'
                              : 'bg-indigo-950/20 border-indigo-900/30 text-indigo-400'
                          }`}>
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> :
                             isSkipped ? <SkipForward className="h-4 w-4" /> :
                             isInProgress ? <Play className="h-4 w-4" /> :
                             isLocked ? <Lock className="h-4 w-4" /> :
                             <Unlock className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className={`text-base font-bold mb-1 transition-colors ${
                          isCompleted ? 'text-emerald-300' : 'text-white group-hover:text-indigo-400'
                        }`}>
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                          {course.description}
                        </p>
                      </div>

                      {/* Card Footer Metadata */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-850/80 text-[11px] text-slate-400">
                        <span className="font-semibold">{course.provider}</span>
                        <span>{course.estimated_hours} hrs</span>
                      </div>

                      {/* Locked Overlap Note */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2 shadow-xl">
                            <Lock className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-xs text-slate-300 font-medium">Prerequisites Locked</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL SIDE PANEL DRAWER */}
      {selectedItemId && selectedItem && selectedPathItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Drawer container */}
          <div className="w-full max-w-md bg-slate-950 h-full p-6 md:p-8 flex flex-col justify-between shadow-2xl border-l border-slate-800 animate-slide-in">
            <div>
              {/* Close Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    selectedItem.type === 'course' 
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : selectedItem.type === 'project'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {selectedItem.type}
                  </span>
                  <span className="text-xs text-slate-500">• {selectedItem.provider}</span>
                </div>
                <button 
                  onClick={() => setSelectedItemId(null)}
                  className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Title & Desc */}
              <h2 className="text-lg font-bold text-white mb-2">{selectedItem.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{selectedItem.description}</p>

              {/* Why Recommended AI Explanation */}
              <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" /> PathWise AI Recommendation
                </div>
                <p className="text-sm text-indigo-100/90 leading-relaxed italic">
                  "{selectedPathItem.reason}"
                </p>
              </div>

              {/* Skills Gained */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Skills Taught</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.skills_taught.map((skill, sIdx) => (
                    <span key={sIdx} className="text-xs bg-slate-900 border border-slate-850 px-2 py-1 rounded text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {selectedItem.prerequisite_skills.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prerequisites</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.prerequisite_skills.map((skill, sIdx) => (
                      <span key={sIdx} className="text-xs bg-slate-900/40 border border-dashed border-slate-800 px-2 py-1 rounded text-slate-400">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-6 border-t border-slate-880 space-y-4">
              
              {/* Primary action based on status */}
              {selectedPathItem.status === 'locked' ? (
                <div className="flex items-center gap-2 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/25 p-3 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>This resource is locked. Complete previous recommended steps to satisfy prerequisites.</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  {selectedPathItem.status !== 'completed' && (
                    <button
                      onClick={() => {
                        onItemStatusChange(selectedItem.id, 'completed');
                        setSelectedItemId(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" /> Mark Completed
                    </button>
                  )}
                  {selectedPathItem.status === 'available' && (
                    <button
                      onClick={() => {
                        onItemStatusChange(selectedItem.id, 'in_progress');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition cursor-pointer"
                    >
                      <Play className="h-4 w-4" /> Start Studying
                    </button>
                  )}
                  {selectedPathItem.status === 'in_progress' && (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-indigo-950 border border-indigo-800/40 text-indigo-300 font-semibold py-3 px-4 rounded-xl cursor-default">
                      <Play className="h-4 w-4 animate-pulse text-indigo-400" /> In Progress
                    </div>
                  )}
                </div>
              )}

              {/* Adaptability Feedback Section */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adapt Learning Path</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onFeedback(selectedItem.id, 'too_easy');
                      setSelectedItemId(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 py-2 rounded-lg transition cursor-pointer"
                  >
                    Too Easy
                  </button>
                  <button
                    onClick={() => {
                      onFeedback(selectedItem.id, 'too_hard');
                      setSelectedItemId(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 py-2 rounded-lg transition cursor-pointer"
                  >
                    Too Hard
                  </button>
                  <button
                    onClick={() => {
                      onFeedback(selectedItem.id, 'not_relevant');
                      setSelectedItemId(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-rose-950/20 border border-slate-700 hover:border-rose-900/40 text-slate-300 hover:text-rose-400 py-2 rounded-lg transition cursor-pointer"
                  >
                    Not Relevant
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onFeedback(selectedItem.id, 'skip');
                      setSelectedItemId(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-400 hover:text-slate-200 py-2 rounded-lg transition cursor-pointer"
                  >
                    Skip & Unlock Next
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
