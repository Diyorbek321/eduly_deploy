import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';

// Initialize Gemini lazily
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini AI:", e);
}

// Define tools for the AI to fetch data
const getStudentsFunction: FunctionDeclaration = {
  name: 'getStudentsData',
  description: 'Get a list of all students, including their status, debt, and group information.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getGroupsFunction: FunctionDeclaration = {
  name: 'getGroupsData',
  description: 'Get a list of all groups, including their course, teacher, schedule, and capacity.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getTeachersFunction: FunctionDeclaration = {
  name: 'getTeachersData',
  description: 'Get a list of all teachers, including their subject and phone number.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getCoursesFunction: FunctionDeclaration = {
  name: 'getCoursesData',
  description: 'Get a list of all courses, including their duration and price.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export const AIChatWidget = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: 'Salom! Men Eduly AI yordamchisiman. Markaz faoliyati bo\'yicha qanday ma\'lumotlar kerak?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store the chat session
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    // Initialize chat session when opened
    if (isOpen && !chatRef.current && ai) {
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `Siz Eduly o'quv markazi boshqaruv tizimining AI yordamchisisiz. 
Sizning vazifangiz markaz administratoriga ma'lumotlarni tahlil qilishda va qaror qabul qilishda yordam berish.
Sizga berilgan funksiyalardan foydalanib, o'quvchilar, guruhlar, o'qituvchilar va kurslar haqida ma'lumot oling.
Javoblaringizni o'zbek tilida, qisqa, aniq va tushunarli qilib bering.
Markdown formatidan foydalanib, ma'lumotlarni chiroyli ko'rinishda taqdim eting (jadvallar, ro'yxatlar va h.k.).`,
          tools: [{
            functionDeclarations: [
              getStudentsFunction,
              getGroupsFunction,
              getTeachersFunction,
              getCoursesFunction
            ]
          }],
          temperature: 0.7,
        }
      });
    }
  }, [isOpen]);

  if (!isAdmin) return null;

  const handleFunctionCall = async (functionCall: any) => {
    try {
      const endpointByName: Record<string, { url: string; params?: Record<string, unknown> }> = {
        getStudentsData: { url: '/students', params: { limit: 500 } },
        getGroupsData: { url: '/groups', params: { limit: 500 } },
        getTeachersData: { url: '/teachers', params: { limit: 500 } },
        getCoursesData: { url: '/courses', params: { limit: 500 } },
      };
      const endpoint = endpointByName[functionCall.name];
      if (!endpoint) {
        throw new Error(`Unknown function: ${functionCall.name}`);
      }
      const { data } = await api.get(endpoint.url, { params: endpoint.params });
      const rows = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      return {
        name: functionCall.name,
        response: { items: rows, count: Array.isArray(rows) ? rows.length : 0 },
      };
    } catch (error) {
      console.error('Error executing function:', error);
      return {
        name: functionCall.name,
        response: { error: "Ma'lumotlarni yuklashda xatolik yuz berdi." },
      };
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) return;

      let response = await chatRef.current.sendMessage({ message: userMessage });
      
      // Handle function calls if any
      while (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponses = await Promise.all(
          response.functionCalls.map(async (call: any) => {
            const res = await handleFunctionCall(call);
            return {
              functionResponse: {
                name: call.name,
                response: res.response,
                id: call.id
              }
            };
          })
        );
        
        response = await chatRef.current.sendMessage({
          message: functionResponses
        });
      }

      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: response.text || 'Kechirasiz, javob qaytarishda xatolik yuz berdi.' 
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: 'Kechirasiz, tizimda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-[#ec5b13] text-white rounded-full shadow-2xl hover:bg-orange-600 hover:scale-105 transition-all z-50 flex items-center justify-center group"
        >
          <MessageSquare size={24} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI Yordamchi
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 transition-all duration-300",
            isExpanded ? "w-[800px] h-[80vh] max-w-[calc(100vw-1.5rem)]" : "w-[380px] h-[600px] max-w-[calc(100vw-1.5rem)] max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="bg-[#ec5b13] p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight">Eduly AI</h3>
                <p className="text-xs text-orange-100 font-medium">Boshqaruv yordamchisi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-[#ec5b13]"
                )}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-sm",
                  msg.role === 'user' 
                    ? "bg-[#ec5b13] text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm prose-orange max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="size-8 rounded-full bg-orange-100 text-[#ec5b13] flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} />
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#ec5b13]" />
                  <span className="text-xs font-medium text-slate-500">Tahlil qilinmoqda...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Savolingizni yozing..."
                className="flex-1 max-h-32 min-h-[44px] p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none text-sm transition-all"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 bg-[#ec5b13] text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
            <div className="mt-2 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                AI xato ma'lumot berishi mumkin. Muhim qarorlardan oldin tekshiring.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
