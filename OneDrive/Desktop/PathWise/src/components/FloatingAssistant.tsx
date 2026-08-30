import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertCircle, Check } from 'lucide-react';
import type { LearningPath, User, Course } from '../types';
import { MOCK_COURSES } from '../mockData';


interface FloatingAssistantProps {
  user: User;
  learningPath: LearningPath;
  onApplyPathChange: (changeType: string, payload: any) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  confirmationAction?: {
    label: string;
    type: string;
    payload: any;
  };
}

export default function FloatingAssistant({ user, learningPath, onApplyPathChange }: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const courseMap = new Map<string, Course>();
  MOCK_COURSES.forEach(c => courseMap.set(c.id, c));

  // Initialize welcome message when opened first time
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `Hi! I'm your PathWise study companion. I can answer questions about your learning path, explain sequencing, or recommend updates. What would you like to discuss today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simulate AI response based on keywords
    setTimeout(() => {
      generateAIResponse(text);
    }, 1000);
  };

  const generateAIResponse = (userText: string) => {
    const textLower = userText.toLowerCase();
    let replyText = "";
    let confirmationAction = undefined;

    // Load some facts for context
    const currentDomain = user.goal_tags[0] || 'Web Dev';
    const activeItems = learningPath.stages
      .flatMap(s => s.items)
      .filter(item => item.status === 'available' || item.status === 'in_progress');
    const firstActive = activeItems[0] ? courseMap.get(activeItems[0].course_id) : null;

    if (textLower.includes('why') || textLower.includes('sequence') || textLower.includes('prerequisite')) {
      if (firstActive) {
        replyText = `Your current active course is "${firstActive.title}". We placed it in the early stages because it teaches standard tools in ${currentDomain} that are required as foundational prerequisites for subsequent applied projects.`;
      } else {
        replyText = `Courses are ordered topologically based on prerequisite skills. For instance, we ensure foundational libraries are learned before you start building complex portfolio projects.`;
      }
    } else if (textLower.includes('skip') || textLower.includes('too easy') || textLower.includes('fast')) {
      if (firstActive) {
        replyText = `I can skip "${firstActive.title}" for you if you already know it. This will automatically unlock downstream courses that depend on it.`;
        confirmationAction = {
          label: `Skip "${firstActive.title}" & unlock downstream?`,
          type: 'SKIP_ITEM',
          payload: { itemId: firstActive.id }
        };
      } else {
        replyText = `You can skip any unlocked course by clicking its card and selecting "Skip & Unlock Next". Let me know if there's a specific course you'd like to bypass.`;
      }
    } else if (textLower.includes('time') || textLower.includes('hours') || textLower.includes('week') || textLower.includes('weekend')) {
      replyText = `You currently have a budget of ${user.time_budget_hours_per_week} hours per week. If you need to make faster progress, I can adjust your budget to 15 hours per week, which will compress your milestones.`;
      confirmationAction = {
        label: "Increase budget to 15 hours/week?",
        type: 'UPDATE_TIME_BUDGET',
        payload: { hours: 15 }
      };
    } else if (textLower.includes('job') || textLower.includes('career') || textLower.includes('ready') || textLower.includes('hire')) {
      const remainingHours = learningPath.stages
        .flatMap(s => s.items)
        .filter(item => item.status !== 'completed' && item.status !== 'skipped')
        .reduce((sum, item) => sum + (courseMap.get(item.course_id)?.estimated_hours || 0), 0);

      const weeks = Math.ceil(remainingHours / user.time_budget_hours_per_week);

      replyText = `Based on your remaining courses (${remainingHours} hours total) and your weekly availability of ${user.time_budget_hours_per_week} hours, it will take you approximately ${weeks} weeks to complete this roadmap and build a career-ready portfolio.`;
    } else {
      replyText = `I understand. I can help configure your profile, change time budgets, or explain recommended sequencing. Let me know if you would like me to skip a course, adjust hours, or regenerate your pathway.`;
    }

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: replyText,
      timestamp: new Date(),
      confirmationAction
    };

    setMessages(prev => [...prev, aiMsg]);
  };

  const handleConfirmAction = (action: NonNullable<ChatMessage['confirmationAction']>, msgId: string) => {
    // Apply path changes in App
    onApplyPathChange(action.type, action.payload);

    // Remove action from messages array to prevent duplicate clicks
    setMessages(prev => 
      prev.map(msg => {
        if (msg.id === msgId) {
          return {
            ...msg,
            text: `${msg.text} (Action applied successfully! ✔)`,
            confirmationAction: undefined
          };
        }
        return msg;
      })
    );
  };

  // Suggestion Chips
  const suggestions = [
    "Why is X before Y?",
    "Can I skip the current course?",
    "How long until I'm career-ready?",
    "Increase weekly hours"
  ];

  return (
    <>
      {/* FLOATING ACTION TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-650 hover:to-cyan-650 text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* DRAWER PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/45 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-950 h-full flex flex-col justify-between shadow-2xl border-l border-slate-800 animate-slide-in">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">PathWise AI Companion</h3>
                  <span className="text-[10px] text-slate-400">Contextual Chat Assistant</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-900 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[80vh]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex flex-col gap-2`}>
                    <div className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
                      msg.sender === 'ai' 
                        ? 'bg-slate-900/80 border-slate-850 text-slate-100' 
                        : 'bg-indigo-950/80 border-indigo-900/50 text-indigo-100'
                    }`}>
                      {msg.text}
                    </div>

                    {/* CONFIRMATION CHIP */}
                    {msg.confirmationAction && (
                      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 space-y-2 mt-1 animate-pulse">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase">
                          <AlertCircle className="h-3.5 w-3.5" /> Action Confirmation
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold">{msg.confirmationAction.label}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmAction(msg.confirmationAction!, msg.id)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="h-3 w-3" /> Update Path
                          </button>
                          <button
                            onClick={() => {
                              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, confirmationAction: undefined } : m));
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] py-1.5 rounded transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & suggestions footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 space-y-3">
              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSend(suggestion)}
                    className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Form Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white transition cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
