import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Play, Pause, RefreshCw, ArrowLeft, Trophy, Coins, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

const FOCUS_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

export default function Focus() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  }, [mode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (mode === 'focus' && (timeLeft % 60 === 0)) {
           // Small reward every minute of focus
           setCoinsEarned(prev => prev + 1);
        }
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (mode === 'focus') {
        setCoinsEarned(prev => prev + 50); // Big reward for completion
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
      }
      setMode(mode === 'focus' ? 'break' : 'focus');
      setTimeLeft(mode === 'focus' ? BREAK_TIME : FOCUS_TIME);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timeLeft / (mode === 'focus' ? FOCUS_TIME : BREAK_TIME);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-12 pb-20 text-center"
    >
      {/* Header */}
      <div className="flex items-center gap-4 text-left">
        <Link to="/" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Deep Work</h1>
          <p className="text-on-surface-variant text-sm">Focus and earn academic rewards.</p>
        </div>
      </div>

      {/* Timer Display */}
      <div className="relative flex flex-col items-center justify-center py-10">
        <div className="relative w-72 h-72">
          {/* Background Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              className="text-surface-container-high" 
              cx="144" cy="144" r="130" 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="12" 
            />
            {/* Progress Ring */}
            <motion.circle 
              cx="144" cy="144" r="130" 
              fill="transparent" 
              stroke={mode === 'focus' ? "url(#timer-gradient)" : "url(#break-gradient)"}
              strokeWidth="12"
              strokeDasharray="816.8"
              animate={{ strokeDashoffset: 816.8 * (1 - progress) }}
              transition={{ duration: 0.5, ease: "linear" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4647d3" />
                <stop offset="100%" stopColor="#9396ff" />
              </linearGradient>
              <linearGradient id="break-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
            <motion.span 
              key={timeLeft}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black font-headline tracking-tighter"
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className={cn(
              "text-xs font-black uppercase tracking-[0.2em]",
              mode === 'focus' ? "text-primary" : "text-secondary"
            )}>
              {mode === 'focus' ? 'Focus Session' : 'Take a Break'}
            </span>
          </div>
        </div>

        {/* Floating Particles/Aura during activation */}
        <AnimatePresence>
          {isActive && mode === 'focus' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
               <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button 
          onClick={resetTimer}
          className="p-4 rounded-3xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
        >
          <RefreshCw size={24} />
        </button>
        
        <button 
          onClick={toggleTimer}
          className={cn(
            "w-20 h-20 rounded-4xl flex items-center justify-center text-white shadow-xl transition-all active:scale-90",
            isActive ? "bg-surface-container-highest text-on-surface" : "premium-gradient"
          )}
        >
          {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </button>

        <div className="w-14" /> {/* Spacer for symmetry */}
      </div>

      {/* Rewards Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low p-6 rounded-4xl border border-surface-container flex flex-col items-center gap-2">
          <Coins className="text-primary" size={24} strokeWidth={2.5} />
          <div className="text-2xl font-black font-headline text-on-surface">{coinsEarned}</div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Coins Earned</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-4xl border border-surface-container flex flex-col items-center gap-2">
          <Zap className="text-secondary" size={24} strokeWidth={2.5} />
          <div className="text-2xl font-black font-headline text-on-surface">{Math.floor(coinsEarned / 10)}</div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">XP Gained</p>
        </div>
      </div>

      {/* Completion Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-6"
          >
            <div className="bg-white rounded-4xl p-10 shadow-2xl border-4 border-primary flex flex-col items-center space-y-4 max-w-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                <Trophy size={48} />
              </div>
              <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Quest Complete!</h2>
              <p className="text-on-surface-variant font-medium text-sm">You've unlocked 50 extra coins for your deep focus.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-primary/5 rounded-4xl p-6 border border-primary/10">
        <h3 className="font-bold flex items-center gap-2 mb-2">
          <Zap size={18} className="text-primary" /> Why Deep Work?
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Deep work represents the ability to focus without distraction on a cognitively demanding task. In our system, this state recharges your daily "Learning Momentum" and multiplies your XP gains.
        </p>
      </div>
    </motion.div>
  );
}
