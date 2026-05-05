import { type ReactNode } from 'react';
import { Coins, Flame, BookOpen, MapPin, Plus, Calendar as CalendarIcon, Users, ClipboardCheck, Trophy, Zap, CheckCircle2, Star, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { useGame } from '../context/GameContext';
import { useStudent } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { DashboardSkeleton } from '../components/Skeleton';

import { Link } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Dashboard() {
  const { coins } = useGame();
  const { user } = useAuth();
  const { profile, attendance, schedule, loading } = useStudent();

  // First-fetch skeleton — only when nothing has loaded yet, so that
  // background refreshes don't blank out the live UI.
  if (loading && !profile && !schedule && !attendance) {
    return <DashboardSkeleton />;
  }

  const displayName = profile?.name ?? user?.name ?? user?.email ?? 'Student';
  const firstName = displayName.split(' ')[0];
  const totalAttendance =
    (attendance?.present_count ?? 0) +
    (attendance?.absent_count ?? 0) +
    (attendance?.late_count ?? 0) +
    (attendance?.excused_count ?? 0);
  const attendedCount = (attendance?.present_count ?? 0) + (attendance?.late_count ?? 0);
  const attendancePct = totalAttendance > 0
    ? Math.round((attendedCount / totalAttendance) * 100)
    : 0;
  const ringCircumference = 364.4;
  const ringOffset = ringCircumference * (1 - attendancePct / 100);
  const nextClass = schedule?.items?.[0];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant font-headline font-bold text-sm tracking-wide uppercase">
              Welcome back, {firstName}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mt-1">
              Ready for your quest?
            </h1>
          </div>
          <div className="flex gap-3">
            <Badge icon={<Coins className="text-primary fill-primary" size={18} />} label={`${coins} coins`} />
            <div className="relative">
              <Badge icon={<Flame className="text-tertiary fill-tertiary" size={18} />} label="5 days" color="tertiary" />
              <div className="absolute -top-2 -right-2 bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                +20% XP
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Daily Overview */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-8 bg-surface-container-lowest rounded-4xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-sm"
          >
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Daily Overview</h2>
                <p className="text-on-surface-variant text-sm">
                  {totalAttendance > 0
                    ? `You've attended ${attendedCount} of ${totalAttendance} tracked classes. Keep up the momentum!`
                    : "No attendance records yet. Your first class is just around the corner!"}
                </p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <Tag label="ON TRACK" color="secondary" />
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">Milestone: 3/5 Classes</span>
                </div>
                <div className="w-[1px] h-8 bg-surface-container-high hidden md:block" />
                <div className="flex flex-col items-center md:items-start gap-2">
                  <Tag label="MORNING COMPLETED" color="primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">+50 Streak Bonus</span>
                </div>
              </div>
            </div>
            
            {/* Progress Ring */}
            <div className="relative flex items-center justify-center w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  className="text-surface-container-high" 
                  cx="64" cy="64" r="58" 
                  fill="transparent" 
                  stroke="currentColor" 
                  strokeWidth="10" 
                />
                <motion.circle 
                  initial={{ strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                  cx="64" cy="64" r="58" 
                  fill="transparent" 
                  stroke="url(#progress-gradient)" 
                  strokeDasharray="364.4" 
                  strokeLinecap="round" 
                  strokeWidth="10" 
                />
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4647d3" />
                    <stop offset="100%" stopColor="#9396ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-headline">{attendancePct}%</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Done</span>
              </div>
            </div>
          </motion.div>

          {/* Next Class */}
          <motion.div 
            variants={itemVariants}
            className="md:col-span-4 bg-primary rounded-4xl p-6 text-on-primary flex flex-col justify-between aspect-square md:aspect-auto shadow-lg shadow-primary/20"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-lg">UP NEXT</span>
            </div>
            <div className="space-y-1">
              <p className="text-white/70 font-bold text-xs uppercase tracking-widest">
                {nextClass?.time ?? 'Schedule'}
              </p>
              <h3 className="text-2xl font-extrabold leading-tight">
                {nextClass?.course_name ?? 'No upcoming class'}
              </h3>
              <p className="text-white/80 flex items-center gap-1 text-sm">
                <MapPin size={14} /> {nextClass?.room ?? '—'}
              </p>
            </div>
            <Link
              to={nextClass ? `/schedule/class/${nextClass.group_id}` : '/schedule'}
              className="w-full mt-4 bg-white text-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center"
            >
              View Details
            </Link>
          </motion.div>

          {/* Deadlines */}
          <motion.div variants={itemVariants} className="md:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Upcoming Deadlines</h2>
              <Link to="/homework" className="text-primary font-bold text-sm hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              <Link to="/homework" className="block">
                <DeadlineItem title="Homework" subtitle="See your assigned tasks & earn coins" tag="Open" color="primary" />
              </Link>
            </div>
            
            <Link to="/mock-tests" className="block group">
              <div className="bg-primary/5 border border-primary/20 p-6 rounded-4xl flex items-center justify-between group-hover:bg-primary transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest group-hover:text-white/80">Every 2 Weeks</span>
                  <h4 className="text-lg font-bold group-hover:text-white">Free Mock Exam Available</h4>
                </div>
                <div className="bg-primary text-white p-3 rounded-2xl group-hover:bg-white group-hover:text-primary transition-colors">
                  <ClipboardCheck size={20} />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="md:col-span-5 space-y-4">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <ActionButton icon={<Plus size={20} />} label="Add Homework" color="primary" />
              <ActionButton icon={<CalendarIcon size={20} />} label="View Timetable" color="secondary" />
              <Link to="/focus" className="col-span-2 group">
                <div className="flex items-center justify-between p-6 bg-tertiary/5 rounded-4xl border border-tertiary/20 hover:bg-tertiary transition-all group shadow-sm">
                  <div className="flex items-center gap-4 text-tertiary group-hover:text-white transition-colors">
                    <div className="bg-tertiary/10 p-3 rounded-2xl group-hover:bg-white/20 transition-colors">
                      <Timer size={24} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-lg leading-tight uppercase tracking-tight">Focus Mode</h4>
                      <p className="text-[10px] font-bold opacity-70 group-hover:opacity-100">Earn +50 XP Bonus</p>
                    </div>
                  </div>
                  <Zap size={24} className="text-tertiary group-hover:text-white transition-colors" />
                </div>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-secondary to-secondary-dim p-6 rounded-4xl text-white flex items-center justify-between shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Study Group</p>
                <h4 className="text-lg font-bold">Join the Bio Group?</h4>
              </div>
              <Users size={32} />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* New Achievements Section */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Recent Achievements</h2>
          <Link to="/leaderboard" className="text-primary font-bold text-sm hover:underline">View Leaderboard</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <AchievementCard 
            icon={<Trophy className="text-tertiary" size={24} />} 
            title="Logic Master" 
            desc="50 Exercises Done" 
            badge="GOLD"
          />
          <AchievementCard 
            icon={<Zap className="text-primary" size={24} />} 
            title="Fast Learner" 
            desc="10 Rapid Solves" 
            badge="SILVER"
          />
          <AchievementCard 
            icon={<CheckCircle2 className="text-secondary" size={24} />} 
            title="Streak King" 
            desc="14 Day Milestone" 
            badge="GOLD"
          />
          <AchievementCard 
            icon={<Star className="text-tertiary" size={24} />} 
            title="Top Student" 
            desc="Reached Rank #100" 
            badge="DIAMOND"
          />
        </div>
      </motion.section>
    </motion.div>
  );
}

function AchievementCard({ icon, title, desc, badge }: { icon: ReactNode, title: string, desc: string, badge: string }) {
  const badgeColors: Record<string, string> = {
    GOLD: "text-tertiary border-tertiary/20 bg-tertiary/5",
    SILVER: "text-on-surface-variant border-surface-container-high bg-surface-container-low",
    DIAMOND: "text-primary border-primary/20 bg-primary/5",
  };
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-white p-6 rounded-4xl border border-surface-container shadow-sm flex flex-col items-center text-center space-y-3"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${badgeColors[badge]}`}>
        {icon}
      </div>
      <div>
        <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${badgeColors[badge]}`}>
          {badge} MILESTONE
        </div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-[10px] text-on-surface-variant font-medium mt-1">{desc}</p>
      </div>
    </motion.div>
  );
}

function Badge({ icon, label, color = "primary" }: { icon: ReactNode, label: string, color?: string }) {
  return (
    <div className={`flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-full shadow-sm`}>
      {icon}
      <span className={`font-headline font-bold text-on-surface`}>{label}</span>
    </div>
  );
}

function Tag({ label, color }: { label: string, color: string }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    error: "bg-error/10 text-error",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-headline ${colors[color]}`}>
      {label}
    </span>
  );
}

function DeadlineItem({ title, subtitle, tag, color }: { title: string, subtitle: string, tag: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ x: 8 }}
      whileTap={{ scale: 0.98 }}
      className="bg-surface-container-low p-5 rounded-3xl flex items-center justify-between group hover:bg-surface-container transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color === 'error' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
          <BookOpen size={20} />
        </div>
        <div>
          <h4 className="font-bold text-on-surface">{title}</h4>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <Tag label={tag} color={color} />
    </motion.div>
  );
}

function ActionButton({ icon, label, color }: { icon: ReactNode, label: string, color: string }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
  };
  return (
    <button className="flex flex-col items-start p-6 bg-surface-container-highest/20 rounded-4xl border border-outline-variant/10 hover:bg-surface-container-highest transition-all group w-full">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colors[color]}`}>
        {icon}
      </div>
      <span className="font-bold text-left leading-tight">{label}</span>
    </button>
  );
}
