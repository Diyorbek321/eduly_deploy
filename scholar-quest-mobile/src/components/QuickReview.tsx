import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { X, Check, RotateCcw, Zap, Trophy, Coins, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useGame } from '../context/GameContext';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  subject: string;
}

const initialCards: Flashcard[] = [
  { id: 1, subject: 'Math', question: 'What is the derivative of sin(x)?', answer: 'cos(x)' },
  { id: 2, subject: 'Science', question: 'What is the chemical symbol for Gold?', answer: 'Au' },
  { id: 3, subject: 'History', question: 'When did the French Revolution start?', answer: '1789' },
  { id: 4, subject: 'Math', question: 'Value of π to 2 decimal places?', answer: '3.14' },
  { id: 5, subject: 'Science', question: 'Unit of electrical resistance?', answer: 'Ohm (Ω)' },
];

export default function QuickReview({ onClose }: { onClose: () => void }) {
  const { addCoins, addMastery } = useGame();
  const [cards, setCards] = useState(initialCards);
  const [direction, setDirection] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    if (isFinished && stats.correct > 0) {
      addCoins(stats.correct * 10);
      addMastery(stats.correct * 2); // 2% mastery per correct answer
    }
  }, [isFinished, stats.correct, addCoins, addMastery]);

  const handleSwipe = (isCorrect: boolean) => {
    setStats(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
    }));
    
    setTimeout(() => {
      setCards(prev => prev.slice(1));
      setDirection(null);
      if (cards.length === 1) {
        setIsFinished(true);
      }
    }, 200);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2">
          <Trophy size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black font-headline uppercase tracking-tight">Review Complete!</h2>
          <p className="text-on-surface-variant font-medium mt-2">You mastered {stats.correct} concepts today.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm font-headline">
          <div className="bg-surface-container-low p-4 rounded-3xl border border-surface-container">
            <div className="text-primary text-2xl font-black">+{stats.correct * 10}</div>
            <div className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center justify-center gap-1">
              <Coins size={10} /> Coins
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-3xl border border-surface-container">
            <div className="text-secondary text-2xl font-black">+{stats.correct * 5}</div>
            <div className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center justify-center gap-1">
              <Zap size={10} /> Streak XP
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full max-w-xs premium-gradient text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          Return to Learning
          <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 mb-8">
        <Zap className="text-tertiary" size={16} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Daily Quick Session</span>
      </div>

      <div className="relative w-full max-w-[320px] h-[400px]">
        <AnimatePresence>
          {cards.slice(0, 1).map((card) => (
            <FlashcardItem 
              key={card.id} 
              card={card} 
              onSwipe={handleSwipe} 
            />
          ))}
        </AnimatePresence>
        
        {/* Placeholder for Next Card */}
        {cards.length > 1 && (
          <div className="absolute top-4 left-4 right-4 bottom-[-16px] bg-white rounded-4xl border border-surface-container-high -z-10 opacity-50 translate-y-2 scale-95" />
        )}
      </div>

      {/* Control Indicators */}
      <div className="flex gap-12 mt-12">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <div className="w-12 h-12 rounded-full border-2 border-error flex items-center justify-center text-error">
            <X size={24} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-error">Swipe Left</span>
        </div>
        <div className="flex flex-col items-center gap-2 opacity-40">
          <div className="w-12 h-12 rounded-full border-2 border-secondary flex items-center justify-center text-secondary">
            <Check size={24} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-secondary">Swipe Right</span>
        </div>
      </div>
    </div>
  );
}

function FlashcardItem({ card, onSwipe }: { card: Flashcard, onSwipe: (correct: boolean) => void, key?: any }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const greenOpacity = useTransform(x, [0, 100], [0, 0.4]);
  const redOpacity = useTransform(x, [-100, 0], [0.4, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
      key={card.id}
      className="absolute inset-0 cursor-grab active:cursor-grabbing preserve-3d"
    >
      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ rotateY: -180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 180, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full bg-white rounded-4xl shadow-xl border-2 border-surface-container flex flex-col p-8 backface-hidden relative overflow-hidden"
          >
            {/* Overlays */}
            <motion.div style={{ opacity: greenOpacity }} className="absolute inset-0 bg-secondary pointer-events-none" />
            <motion.div style={{ opacity: redOpacity }} className="absolute inset-0 bg-error pointer-events-none" />

            <div className="flex justify-between items-start mb-6">
              <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {card.subject}
              </span>
              <RotateCcw size={16} className="text-on-surface-variant cursor-pointer" onClick={() => setIsFlipped(true)} />
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-2xl font-bold leading-tight text-on-surface">
                {card.question}
              </h3>
            </div>

            <button 
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              Touch to reveal Answer
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: -180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 180, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full premium-gradient rounded-4xl shadow-xl flex flex-col p-8 backface-hidden relative overflow-hidden"
          >
            {/* Overlays */}
            <motion.div style={{ opacity: greenOpacity }} className="absolute inset-0 bg-white/40 pointer-events-none" />
            <motion.div style={{ opacity: redOpacity }} className="absolute inset-0 bg-black/40 pointer-events-none" />

            <div className="flex justify-between items-start mb-6">
               <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Answer
              </span>
              <RotateCcw size={16} className="text-white cursor-pointer" onClick={() => setIsFlipped(false)} />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-3xl font-black leading-tight text-white mb-4">
                {card.answer}
              </h3>
              <p className="text-white/70 text-sm font-medium">Swipe right if you got it correctly!</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => onSwipe(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              >
                Wrong
              </button>
              <button 
               onClick={() => onSwipe(true)}
               className="flex-1 py-3 bg-white text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
              >
                Correct
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
