import { CheckCircle2, Lock, Trophy, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useTutor } from '../context/TutorContext';
import { useGame } from '../context/GameContext';

const pathItems = [
  { id: 1, title: 'Number Systems', sub: 'Completed • 4 Lessons', status: 'completed', align: 'left', milestone: 'Foundation Badge' },
  { id: 2, title: 'Linear Equations', sub: 'Completed • 6 Lessons', status: 'completed', align: 'right' },
  { id: 3, title: 'Algebra Basics', sub: '2/5 Lessons Finished', status: 'active', align: 'left', milestone: 'Equations Hero' },
  { id: 4, title: 'Quadratic Formulas', sub: 'Locked • 8 Lessons', status: 'locked', align: 'right' },
  { id: 5, title: 'Polynomials', sub: 'Locked • 5 Lessons', status: 'locked', align: 'left', milestone: 'Mastery Star' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function LearningPath() {
  const { setContext } = useTutor();
  const { mastery } = useGame();

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (mastery / 100) * circumference;

  useEffect(() => {
    setContext('Advanced Algebra - Linear Equations');
    return () => setContext('General Study');
  }, [setContext]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-12 pb-32"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/learn" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold font-headline">Advanced Algebra</h1>
      </motion.div>

      {/* Progress Card */}
      <motion.section variants={itemVariants} className="bg-white rounded-4xl p-8 flex flex-col items-center justify-center relative shadow-sm border border-surface-container">
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
          <div className="bg-tertiary-container/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-tertiary/10">
            <span className="text-tertiary font-bold text-[10px] tracking-widest uppercase">12 Day Streak</span>
          </div>
          <div className="bg-secondary/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-secondary/10">
            <span className="text-secondary font-black text-[8px] tracking-widest uppercase">+50 XP Bonus</span>
          </div>
        </div>

        <div className="absolute top-6 left-6 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary" title="Algebra Guru">
            <Trophy size={14} />
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary" title="Daily Voyager">
            <CheckCircle2 size={14} />
          </div>
        </div>
        
        <div className="relative w-32 h-32 mb-6 text-on-surface">
          <svg className="w-full h-full transform -rotate-90">
            <circle className="text-surface-container-high" cx="64" cy="64" r={radius} fill="transparent" stroke="currentColor" strokeWidth="8" />
            <motion.circle 
              className="text-primary" 
              cx="64" 
              cy="64" 
              r={radius} 
              fill="transparent" 
              stroke="currentColor" 
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round" 
              strokeWidth="8" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black text-primary"
            >
              {Math.round(mastery)}%
            </motion.span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Mastery</span>
          </div>
        </div>
        <p className="text-on-surface-variant text-sm font-medium">3 modules left to unlock Final Exam</p>
      </motion.section>

      {/* Roadmap */}
      <motion.section variants={itemVariants} className="relative py-12">
        {/* Central Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-surface-container-high rounded-full">
          <div className="w-full bg-primary h-[45%] rounded-full shadow-[0_0_12px_rgba(70,71,211,0.4)]" />
        </div>

        <div className="space-y-24">
          {pathItems.map((item) => (
            <div key={item.id} className={cn("flex items-center gap-8 w-full", item.align === 'right' ? "flex-row-reverse" : "flex-row")}>
              <div className="w-1/2 flex flex-col justify-center">
                <Link 
                  to={item.status !== 'locked' ? `/learn/lesson/${item.id}` : '#'}
                  className={cn(
                    "p-5 rounded-3xl shadow-sm transition-all duration-300 block hover:shadow-md active:scale-[0.98]",
                    item.status === 'active' ? "bg-primary-container/10 border border-primary/20 scale-105" : "bg-white border border-surface-container",
                    item.status === 'locked' && "opacity-50 cursor-not-allowed grayscale",
                    item.align === 'left' ? "text-right mr-auto" : "text-left ml-auto"
                  )}
                >
                  <h3 className={cn("font-bold text-base", item.status === 'active' && "text-primary")}>{item.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{item.sub}</p>
                  {item.milestone && (
                    <div className="mt-3 flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 w-fit ml-auto mr-0">
                      <Trophy size={10} className="text-primary" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-wider">{item.milestone}</span>
                    </div>
                  )}
                  {item.status === 'active' && (
                    <div className="mt-4 w-full py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md flex items-center justify-center">
                      Continue Quest
                    </div>
                  )}
                </Link>
              </div>

              <div className="relative z-10 w-20 h-20 shrink-0">
                <div className={cn(
                  "w-full h-full rounded-full flex items-center justify-center shadow-lg transition-transform",
                  item.status === 'active' ? "premium-gradient scale-110 active-pulse" : item.status === 'completed' ? "premium-gradient" : "bg-surface-container-highest",
                )}>
                  {item.status === 'completed' ? <CheckCircle2 size={32} className="text-white fill-white/20" /> : 
                   item.status === 'active' ? <span className="text-white font-black text-2xl">ƒx</span> : 
                   <Lock size={24} className="text-on-surface-variant" />}
                </div>
              </div>

              <div className="w-1/2" />
            </div>
          ))}

          {/* Goal */}
          <div className="flex flex-col items-center gap-4 opacity-40">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-tertiary-container flex items-center justify-center">
              <Trophy size={40} className="text-tertiary-container" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.2em] text-tertiary-container">Final Exam</span>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
