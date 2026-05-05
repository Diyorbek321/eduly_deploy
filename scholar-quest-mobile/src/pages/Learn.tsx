import { ArrowRight, Timer, PlayCircle, Rocket, Flag, Bookmark, Zap, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Link } from 'react-router-dom';
import QuickReview from '../components/QuickReview';

const domains = [
  { name: 'Math', count: '12 Active Quests', bg: 'bg-[#1a1c2e]', icon: 'π', image: 'https://picsum.photos/seed/math/800/400' },
  { name: 'Science', count: '8 High-Energy Labs', bg: 'bg-[#004d40]', icon: '⚛', image: 'https://picsum.photos/seed/science/800/400' },
  { name: 'Language', count: '5 Courses', bg: 'bg-tertiary', icon: '文' },
  { name: 'History', count: '10 Epochs', bg: 'bg-primary-dim', icon: '🏛' },
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

export default function Learn() {
  const [showReview, setShowReview] = useState(false);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-20"
    >
      {/* Daily Flashcard Quest Banner */}
      <motion.section variants={itemVariants}>
        <div className="bg-gradient-to-br from-[#1a1c2e] to-[#2a2d4d] rounded-4xl p-8 relative overflow-hidden shadow-xl border border-[#ffffff10]">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-primary backdrop-blur-md">
              <Sparkles size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                  Daily Quest
                </span>
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  Available Now
                </span>
              </div>
              <h2 className="text-3xl font-headline font-black text-white tracking-tight">Active Recall Challenge</h2>
              <p className="text-white/70 text-sm mt-2 max-w-md">
                Spend 5 minutes swiping through your daily flashcard deck to maintain your streak and earn double mastery points.
              </p>
            </div>
            <button 
              onClick={() => setShowReview(true)}
              className="bg-white text-[#1a1c2e] font-black px-8 py-4 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95"
            >
              Start Swiping
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Quick Review Modal */}
      <AnimatePresence>
        {showReview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-5xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowReview(false)}
                className="absolute top-6 right-6 p-2 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-colors z-50 text-on-surface"
              >
                <X size={20} />
              </button>
              <div className="p-8">
                <QuickReview onClose={() => setShowReview(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <motion.section variants={itemVariants}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-headline uppercase tracking-[0.2em] text-primary font-bold">Quests Await</span>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight mt-1">Exercise Domains</h2>
          </div>
          <button className="text-primary font-headline font-bold text-sm flex items-center gap-1 group">
            View All Categories 
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {domains.map((domain, i) => (
            <Link 
              to="/learn/path"
              key={domain.name}
              className={cn(
                "relative rounded-4xl overflow-hidden group cursor-pointer",
                i < 2 ? "md:col-span-2 lg:col-span-3 aspect-video" : "md:col-span-1 lg:col-span-1 aspect-square",
                !domain.image && domain.bg
              )}
            >
              {domain.image && (
                <img 
                  src={domain.image} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt={domain.name}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                <span className="text-4xl absolute top-6 left-6 opacity-20 text-white">{domain.icon}</span>
                <h3 className="text-white font-headline text-2xl font-extrabold">{domain.name}</h3>
                <p className="text-white/70 text-sm font-medium">{domain.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Recommended */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-headline font-bold">Recommended for You</h2>
          <div className="h-[2px] flex-grow bg-surface-container-highest rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RecommendCard 
            subject="MATHEMATICS" 
            title="Calculus: Derivative Mastery" 
            progress={65} 
            difficulty="HARD" 
            time="15 MIN" 
            image="https://picsum.photos/seed/calc/400/200"
            color="error"
          />
          <RecommendCard 
            subject="CHEMISTRY" 
            title="Introduction to Valence" 
            progress={0} 
            difficulty="EASY" 
            time="10 MIN" 
            image="https://picsum.photos/seed/chem/400/200"
            color="secondary"
          />
          <RecommendCard 
            subject="LANGUAGE" 
            title="The Subjunctive Mood" 
            progress={88} 
            difficulty="MED" 
            time="20 MIN" 
            image="https://picsum.photos/seed/lang/400/200"
            color="tertiary"
          />
        </div>
      </motion.section>
      
      {/* Accelerate Header */}
      <motion.section variants={itemVariants} className="bg-primary/5 p-8 rounded-4xl flex flex-col md:flex-row items-center gap-8 border border-primary/10">
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle className="text-surface-container-highest" cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" />
            <circle className="text-primary" cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset="91.1" strokeLinecap="round" strokeWidth="8" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-headline font-black">75%</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">Weekly Goal</span>
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-headline font-extrabold mb-2">Accelerate Your Learning</h3>
          <p className="text-on-surface-variant mb-6 text-sm">
            You're only 3 exercises away from reaching your weekly academic milestone. Keep the kinetic energy flowing!
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-sm text-xs font-bold">
              <span className="text-tertiary">★</span> +250 XP Pending
            </div>
            <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-sm text-xs font-bold">
              <span className="text-primary">⚡</span> Turbo Active
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function RecommendCard({ subject, title, progress, difficulty, time, image, color }: any) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="bg-white rounded-4xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
    >
      <div className="h-40 relative overflow-hidden">
        <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={title} />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Timer size={12} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-wider">{time}</span>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest">{subject}</span>
            <h4 className="text-lg font-bold mt-1">{title}</h4>
          </div>
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
            difficulty === 'HARD' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
          )}>
            {difficulty}
          </span>
        </div>
        <div className="mt-auto pt-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full premium-gradient transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-grow premium-gradient text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm">
              {progress > 0 ? 'Continue' : 'Start Quest'}
              <PlayCircle size={18} />
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-low text-primary hover:bg-surface-container-high transition-colors">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
