import { useState, useRef, useEffect } from 'react';
import { X, Send, Check, Brain, Bot } from 'lucide-react';
import type { LearningPath, User } from '../types';
import { askAssistantAPI } from '../services/apiClient';

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
  isError?: boolean;
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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when opened first time
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `Hi ${user.name || 'there'}! I'm your PathWise AI study tutor powered live by Gemini. I have context of your path for **"${user.goal}"**. Ask me anything about concepts, code, prerequisites, or scheduling.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, user.goal, user.name, messages.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Call live Gemini Assistant endpoint
      const { reply, confirmationAction } = await askAssistantAPI(text, user.id, user, learningPath);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        confirmationAction,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Assistant error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `❌ Gemini API Error: ${err.message || 'Failed to query live Gemini model'}. Please check your backend GEMINI_API_KEY.`,
          isError: true,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteAction = (action: { type: string; payload: any }) => {
    onApplyPathChange(action.type, action.payload);
    
    // Add system confirmation message to chat
    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'ai',
        text: `✅ Action applied: Roadmap and timelines have been updated!`,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* TRIGGER FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 bg-gradient-to-tr from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white rounded-full shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition duration-200 cursor-pointer flex items-center gap-2 group border border-indigo-400/30"
          title="Open AI Study Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="text-xs font-bold pr-1 hidden sm:inline">AI Tutor</span>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
          </span>
        </button>
      )}

      {/* CHAT POPUP WINDOW */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[520px] bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* HEADER */}
          <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-cyan-300">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  PathWise AI Tutor
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[11px] text-slate-400">Live Gemini Flash Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed space-y-2 whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : msg.isError
                      ? 'bg-rose-950/90 border border-rose-800 text-rose-200 rounded-bl-sm'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <div>{msg.text}</div>

                  {/* Interactive Proposal Action button */}
                  {msg.confirmationAction && (
                    <div className="pt-2 border-t border-slate-700/60 mt-2">
                      <button
                        onClick={() => handleExecuteAction(msg.confirmationAction!)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {msg.confirmationAction.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-200"></span>
                  <span className="text-[11px] ml-1">Calling live Gemini...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT SUGGESTIONS */}
          <div className="px-4 py-2 border-t border-slate-900 flex gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
            <button
              onClick={() => handleSend("Explain why this course is next in my roadmap")}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              Why this course?
            </button>
            <button
              onClick={() => handleSend("How many weeks until I finish this roadmap?")}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              Timeline estimate
            </button>
            <button
              onClick={() => handleSend("Can you skip my active course and recalculate unlocks?")}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              Skip active
            </button>
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your path, concepts, or code..."
              disabled={isTyping}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
