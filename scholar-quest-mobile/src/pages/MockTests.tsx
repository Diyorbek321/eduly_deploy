import { type ReactNode, useState } from 'react';
import { Timer, ClipboardCheck, Calendar, ArrowLeft, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const mockTests = [
  { 
    id: 1, 
    title: 'Advanced SAT Prep', 
    date: 'April 24, 2026', 
    time: '10:00 AM', 
    duration: '180 MIN', 
    status: 'open',
    description: 'Comprehensive math and English evaluation following the latest SAT curriculum. Includes sections on Critical Reading, Mathematics, and Writing.'
  },
  { 
    id: 2, 
    title: 'National Mathematics Olympiad', 
    date: 'May 8, 2026', 
    time: '02:30 PM', 
    duration: '120 MIN', 
    status: 'coming_soon',
    description: 'Focus on higher-order thinking and problem-solving in calculus and geometry. Open to all grade levels with specialized brackets.'
  },
  { 
    id: 3, 
    title: 'Biochemistry Mock Exam', 
    date: 'May 22, 2026', 
    time: '09:00 AM', 
    duration: '90 MIN', 
    status: 'coming_soon',
    description: 'Specialized test covering cellular respiration, genetics, and metabolic pathways. Recommended for AP Biology students.'
  }
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

export default function MockTests() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-10 pb-32"
    >
      {/* Header */}
      <motion.section variants={itemVariants} className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mock Exam Center</h1>
          <p className="text-on-surface-variant text-sm">Professional evaluation to track your quest progress.</p>
        </div>
      </motion.section>

      {/* Hero Banner */}
      <motion.section variants={itemVariants} className="relative overflow-hidden rounded-4xl premium-gradient p-8 text-white shadow-lg">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-xs font-black uppercase tracking-widest">Bi-Weekly Event</span>
          </div>
          <h2 className="text-4xl font-black font-headline max-w-lg leading-tight">
            Free Mock Tests Every 2 Weeks
          </h2>
          <p className="text-white/80 max-w-md leading-relaxed">
            Register for our standardized mock exams at no cost. Perfect your strategy and identify knowledge gaps before the real exam day.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase opacity-60">Next Test In</span>
              <span className="text-2xl font-black font-headline">07:14:22:10</span>
              <span className="text-[8px] font-bold uppercase opacity-40">DAYS : HOURS : MINS : SECS</span>
            </div>
          </div>
        </div>
        
        {/* Background Graphic */}
        <div className="absolute top-0 right-0 p-8 pt-12 opacity-10">
          <ClipboardCheck size={280} />
        </div>
      </motion.section>

      {/* Test List */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-headline">Available Exams</h2>
          <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/5 px-4 py-2 rounded-full">
            <AlertCircle size={14} /> Registered students only
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {mockTests.map((test) => (
            <motion.div 
              key={test.id} 
              whileHover={{ scale: 1.005, borderColor: "rgba(70,71,211,0.4)" }}
              className={cn(
                "bg-white rounded-3xl border border-surface-container shadow-sm transition-all overflow-hidden relative",
                test.status === 'open' ? "" : "opacity-80"
              )}
            >
              <div className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold font-headline">{test.title}</h3>
                      {test.status === 'open' ? (
                        <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Open Registration</span>
                      ) : (
                        <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Upcoming</span>
                      )}
                    </div>
                    <p className="text-on-surface-variant text-sm font-medium">Bi-weekly standard assessment level 4.</p>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <button 
                      onClick={() => toggleExpand(test.id)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 px-6 shadow-sm",
                        expandedId === test.id 
                          ? "bg-on-surface text-white" 
                          : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                      )}
                    >
                      {expandedId === test.id ? 'Hide Details' : 'View Details & Register'}
                      {expandedId === test.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <p className="text-[10px] text-center font-bold text-on-surface-variant uppercase tracking-widest">
                      {test.status === 'open' ? 'Limited Spots Available' : 'Registration Starts Soon'}
                    </p>
                  </div>
                </div>

                {/* Expandable Area */}
                <AnimatePresence>
                  {expandedId === test.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-8 mt-8 border-t border-surface-container space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Description */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <Info size={14} />
                            <span>About this exam</span>
                          </div>
                          <p className="text-on-surface-variant text-sm leading-relaxed">
                            {test.description}
                          </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <DetailBox 
                            icon={<Calendar size={20} className="text-primary" />} 
                            label="Exam Date" 
                            value={test.date} 
                          />
                          <DetailBox 
                            icon={<Clock size={20} className="text-primary" />} 
                            label="Start Time" 
                            value={test.time} 
                          />
                          <DetailBox 
                            icon={<Timer size={20} className="text-primary" />} 
                            label="Duration" 
                            value={test.duration} 
                          />
                        </div>

                        {/* Action */}
                        <div className="pt-4">
                          <button 
                            disabled={test.status !== 'open'}
                            className={cn(
                              "w-full md:w-auto px-12 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3",
                              test.status === 'open' ? "premium-gradient text-white shadow-xl shadow-primary/20" : "bg-surface-container-high text-on-surface-variant cursor-not-allowed"
                            )}
                          >
                            <ClipboardCheck size={20} />
                            {test.status === 'open' ? 'Confirm Free Registration' : 'Registration Locked'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Decorative Number */}
              <span className="absolute -bottom-4 -right-2 text-8xl font-black text-surface-container-low select-none opacity-50">
                0{test.id}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Rules Notice */}
      <motion.section variants={itemVariants} className="bg-surface-container-low rounded-4xl p-8 flex items-start gap-6 border border-surface-container">
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shrink-0 shadow-sm">
          <InfoIcon size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Important Information</h3>
          <ul className="space-y-2">
            {[
              'Tests are released bi-weekly on Friday mornings.',
              'Registration closes 24 hours before the test start time.',
              'Detailed performance reports available 48 hours after completion.',
              'Rankings from mock tests contribute to your Global Rank.'
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                <CheckCircle2 size={16} className="text-secondary shrink-0 mt-0.5" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </motion.section>
    </motion.div>
  );
}

function DetailBox({ icon, label, value }: { icon: ReactNode, label: string, value: string }) {
  return (
    <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-high/50">
      <div className="flex items-center gap-3 mb-1">
        {icon}
        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-bold text-on-surface px-8">{value}</p>
    </div>
  );
}

function InfoIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
