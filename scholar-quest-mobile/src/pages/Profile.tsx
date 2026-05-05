import { Settings as SettingsIcon, Star, Trophy, Zap, Users, Compass, ChevronRight, Award, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useStudent } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

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

function formatMoney(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n));
}

export default function Profile() {
  const { profile, attendance, schedule } = useStudent();
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const displayName = profile?.name ?? user?.name ?? user?.email ?? 'Student';
  const avatarSeed = encodeURIComponent(displayName || 'student');
  const avatarUrl = profile?.avatar || `https://picsum.photos/seed/${avatarSeed}/400`;
  const totalAttendance =
    (attendance?.present_count ?? 0) +
    (attendance?.absent_count ?? 0) +
    (attendance?.late_count ?? 0) +
    (attendance?.excused_count ?? 0);
  const attendedCount = (attendance?.present_count ?? 0) + (attendance?.late_count ?? 0);
  const attendancePct = totalAttendance > 0
    ? Math.round((attendedCount / totalAttendance) * 100)
    : 0;
  const groupCount = profile?.group_names?.length ?? 0;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-20"
    >
      {/* Hero Header */}
      <motion.section variants={itemVariants} className="flex flex-col md:flex-row gap-8 items-start">
        <div className="relative w-32 h-32 md:w-48 md:h-48 shrink-0">
          <div className="absolute inset-0 rounded-4xl premium-gradient rotate-6 opacity-20" />
          <img
            className="w-full h-full rounded-4xl object-cover relative z-10 shadow-xl border-4 border-white"
            src={avatarUrl}
            alt="Profile"
          />
          <div className="absolute -bottom-2 -right-2 z-20 bg-tertiary-container text-on-tertiary-container px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 shadow-lg">
            <Star size={12} fill="currentColor" />
            LVL 12
          </div>
        </div>
        
        <div className="flex-grow pt-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-1">{displayName}</h1>
              <p className="text-xl text-primary font-bold">
                {profile?.status ?? (user?.role ? user.role : 'Scholar')}
              </p>
              {profile?.phone && (
                <p className="text-sm text-on-surface-variant mt-1">{profile.phone}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                to="/settings"
                className="px-6 py-3 rounded-2xl font-bold bg-surface-container-high hover:bg-surface-container-highest transition-all active:scale-95 flex items-center gap-2"
              >
                <SettingsIcon size={18} /> Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="px-6 py-3 rounded-2xl font-bold bg-error/10 text-error hover:bg-error/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Attendance" value={`${attendancePct}%`} color="primary" />
            <StatCard label="Groups" value={String(groupCount)} color="secondary" />
            <StatCard label="Paid" value={formatMoney(profile?.paid ?? 0)} color="tertiary" />
            <StatCard label="Debt" value={formatMoney(profile?.debt ?? 0)} color="on-surface" />
          </div>
        </div>
      </motion.section>

      {/* Main Content */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Learning Circle — strictly the authenticated student's enrolled subjects + group */}
        <div className="lg:col-span-8 bg-surface-container-low rounded-4xl p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t('circles.title')}</h2>
              <p className="text-on-surface-variant text-sm">{t('circles.subtitle')}</p>
            </div>
          </div>

          {(() => {
            const items = schedule?.items ?? [];
            if (!user || user.role !== 'STUDENT' || items.length === 0) {
              return (
                <div className="border-2 border-dashed border-outline-variant/30 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                  <Compass className="text-on-surface-variant/40" size={40} />
                  <span className="mt-3 font-bold text-on-surface-variant">{t('circles.empty')}</span>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(it => (
                  <CircleCard
                    key={it.group_id}
                    id={it.group_id}
                    title={it.course_name || it.group_name}
                    instructor={it.teacher_name || t('circles.teacher')}
                    active={it.status?.toLowerCase() === 'active' || it.status === 'Faol'}
                  />
                ))}
              </div>
            );
          })()}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-4xl p-8 shadow-sm border border-surface-container">
            <h2 className="text-xl font-bold mb-6">Recent Mastery</h2>
            <div className="space-y-6">
              <AchievementItem icon={<Award className="text-tertiary" />} title="Logic Master" sub="Completed 50 exercises" />
              <AchievementItem icon={<Zap className="text-primary" />} title="Speed Runner" sub="Solved 10 problems < 1 min" />
              <AchievementItem icon={<Users className="text-secondary" />} title="Team Player" sub="Joined a new circle" />
            </div>
            <button className="w-full mt-8 py-3 text-sm font-bold text-primary border border-primary/10 rounded-xl hover:bg-primary/5 transition-all">
              View All Badges
            </button>
          </div>

          <div className="glass-card rounded-4xl p-8 space-y-4">
            <h3 className="font-bold">Level Progress</h3>
            <div className="flex justify-between text-xs font-bold">
              <span>84% Complete</span>
              <span>250 XP to LVL 13</span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full premium-gradient w-[84%]" />
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium">Keep it up! Top 5% this week.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-surface-container/50">
      <span className="block text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">{label}</span>
      <span className={cn("text-2xl font-black", `text-${color}`)}>{value}</span>
    </div>
  );
}

function CircleCard({ id, title, instructor, active }: any) {
  const slug = id ?? String(title).toLowerCase().replace(/\s+/g, '-');
  return (
    <Link to={`/circles/${slug}`}>
      <motion.div 
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white p-6 rounded-3xl transition-all duration-300 shadow-sm border border-surface-container/50 cursor-pointer h-full"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
            <BookCardIcon />
          </div>
          {active && <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>}
        </div>
        <h3 className="font-bold text-lg mb-0.5">{title}</h3>
        <p className="text-on-surface-variant text-xs mb-4">{instructor}</p>
      </motion.div>
    </Link>
  );
}

function BookCardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function AchievementItem({ icon, title, sub }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm leading-tight">{title}</p>
        <p className="text-xs text-on-surface-variant">{sub}</p>
      </div>
    </div>
  );
}
