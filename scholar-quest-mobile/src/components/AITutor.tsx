import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// Dynamic import — keeps the @google/genai SDK out of the AITutor chunk
// until the student actually sends a question. Cuts ~150 KB off the
// initial paint of the tutor itself.
const loadAskTutor = async (): Promise<typeof import('../services/geminiService').askTutor> => {
  const mod = await import('../services/geminiService');
  return mod.askTutor;
};

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function AITutor({ currentContext }: { currentContext?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hi! I'm your Quest Companion. Need help with a lesson or an analogy for a tricky concept?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (override?: string) => {
    const messageToSend = override || input.trim();
    if (!messageToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsLoading(true);

    const askTutor = await loadAskTutor();
    const botResponse = await askTutor(messageToSend, currentContext);
    setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-white rounded-3xl shadow-2xl border border-surface-container overflow-hidden flex flex-col mb-4 transition-all duration-300",
              isExpanded ? "w-[90vw] h-[70vh] md:w-[500px]" : "w-[320px] h-[450px]"
            )}
          >
            {/* Header */}
            <div className="premium-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Study Companion</h3>
                  <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
                    {currentContext || 'Ready to help'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest"
            >
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button 
                    onClick={() => handleSend("Explain Quadratic Formulas using a sports analogy")}
                    className="text-[10px] font-bold bg-white border border-surface-container px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors"
                  >
                    ⚽ Sports Analogy
                  </button>
                  <button 
                    onClick={() => handleSend("Give me a study tip for this module")}
                    className="text-[10px] font-bold bg-white border border-surface-container px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors"
                  >
                    💡 Study Tip
                  </button>
                  <button 
                    onClick={() => handleSend("Quiz me on what we just learned!")}
                    className="text-[10px] font-bold bg-white border border-surface-container px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors"
                  >
                    📝 Quick Quiz
                  </button>
                </div>
              )}
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-primary text-white" : "bg-secondary text-white"
                  )}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-xs leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-primary/10 text-on-surface rounded-tr-none" 
                      : "bg-surface-container-high text-on-surface rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center">
                    <Bot size={14} />
                  </div>
                  <div className="bg-surface-container-high p-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-surface-container">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-4 pr-12 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1.5 w-9 h-9 premium-gradient text-white rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[9px] text-center text-on-surface-variant mt-3 font-medium">
                AI can make mistakes. Verify important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90",
          isOpen ? "bg-white text-on-surface border border-surface-container" : "premium-gradient text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-tertiary text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
            !
          </div>
        )}
      </button>
    </div>
  );
}
