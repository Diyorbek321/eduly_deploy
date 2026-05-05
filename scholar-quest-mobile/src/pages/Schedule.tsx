import { useMemo, useState, type ReactNode } from 'react';
import { Flame, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Info, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useStudent } from '../context/StudentContext';
import { ScheduleSkeleton } from '../components/Skeleton';
import { useLocale } from '../context/LocaleContext';
import type { AttendanceItem } from '../lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Schedule() {
  const { schedule, attendance, loading, error } = useStudent();
  const { t, locale } = useLocale();
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

  if (loading && !schedule) return <ScheduleSkeleton />;
  const items = schedule?.items ?? [];
  const allAttendance: AttendanceItem[] = attendance?.items ?? [];

  // Filter attendance to current cursor month for stats + calendar dots
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthAttendance = useMemo(
    () => allAttendance.filter(a => {
      const d = new Date(a.date);
      return d >= monthStart && d <= monthEnd;
    }),
    [allAttendance, cursor]
  );

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of monthAttendance) {
      if (a.status === 'present') c.present++;
      else if (a.status === 'absent') c.absent++;
      else if (a.status === 'late') c.late++;
      else if (a.status === 'excused') c.excused++;
    }
    return c;
  }, [monthAttendance]);

  const total = counts.present + counts.absent + counts.late + counts.excused;
  const attendedCount = counts.present + counts.late;
  const attendancePct = total > 0 ? Math.round((attendedCount / total) * 100) : 0;

  // Build calendar grid for cursor month
  const daysInMonth = monthEnd.getDate();
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0
  const statusByDay = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of monthAttendance) {
      const d = new Date(a.date);
      map[fmtDateKey(d)] = a.status;
    }
    return map;
  }, [monthAttendance]);

  const monthLabel = cursor.toLocaleString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Hero */}
      <motion.section variants={itemVariants} className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-primary to-primary-container p-8 text-on-primary">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">{t('schedule.title')}</h1>
            <p className="text-on-primary opacity-80 max-w-md">{t('schedule.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl p-6 rounded-4xl border border-white/10 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">{t('schedule.overall')}</span>
              <span className="text-5xl font-black font-headline tracking-tighter">{attendancePct}%</span>
            </div>
            <div className="h-12 w-[2px] bg-white/20" />
            <div className="flex flex-col items-center">
              <Flame className="text-tertiary-container" fill="currentColor" size={24} />
              <span className="text-lg font-bold">{attendedCount} / {total}</span>
            </div>
          </div>
        </div>
      </motion.section>

      {error && (
        <div className="rounded-3xl bg-error/10 text-error px-6 py-4 text-sm font-bold">
          {t('schedule.errorLoad')}
        </div>
      )}

      {/* Calendar & Stats */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-4xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold capitalize">{monthLabel}</h2>
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                aria-label={t('schedule.prev')}
                className="p-2 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goNext}
                aria-label={t('schedule.next')}
                className="p-2 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-on-surface-variant font-bold text-xs uppercase tracking-tighter mb-2">{day}</div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e-${i}`} className="h-12" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
              const status = statusByDay[fmtDateKey(date)];
              const isToday = fmtDateKey(date) === fmtDateKey(new Date());
              return (
                <div key={day} className="h-12 flex flex-col items-center justify-center space-y-1">
                  <span className={cn('text-sm font-bold', isToday && 'text-primary')}>{day}</span>
                  {status && (
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      status === 'present' && 'bg-secondary',
                      status === 'absent' && 'bg-error',
                      status === 'excused' && 'bg-tertiary',
                      status === 'late' && 'bg-primary'
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {total === 0 && (
            <div className="mt-6 text-center text-on-surface-variant text-sm">
              {t('schedule.noAttendance')}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-6 pt-6 border-t border-surface-container-high">
            <LegendItem color="bg-secondary" label={t('common.present')} />
            <LegendItem color="bg-error" label={t('common.absent')} />
            <LegendItem color="bg-tertiary" label={t('common.excused')} />
            <LegendItem color="bg-primary" label={t('common.late')} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low rounded-4xl p-8 shadow-sm">
            <h3 className="text-lg font-bold mb-6 capitalize">{monthLabel}</h3>
            <div className="space-y-4">
              <StatItem icon={<CheckCircle2 className="text-secondary" />} label={t('common.present')} value={String(counts.present)} />
              <StatItem icon={<XCircle className="text-error" />} label={t('common.absent')} value={String(counts.absent)} />
              <StatItem icon={<Info className="text-tertiary" />} label={t('common.excused')} value={String(counts.excused)} />
              <StatItem icon={<Clock className="text-primary" />} label={t('common.late')} value={String(counts.late)} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Weekly Schedule */}
      <motion.section variants={itemVariants} className="space-y-6">
        <h2 className="text-2xl font-bold">{t('schedule.weekly')}</h2>
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="bg-surface-container-lowest rounded-3xl p-8 text-center text-on-surface-variant">
              {t('schedule.empty')}
            </div>
          )}
          {items.map((it, idx) => (
            <ScheduleCard
              key={it.group_id}
              id={it.group_id}
              time={[it.schedule, it.time].filter(Boolean).join(' • ') || '—'}
              title={it.course_name || it.group_name}
              instructor={it.teacher_name}
              room={it.room ?? '—'}
              type={it.status?.toUpperCase() ?? 'GROUP'}
              color={['primary', 'tertiary', 'secondary'][idx % 3]}
            />
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-3 h-3 rounded-full', color)} />
      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

function ScheduleCard({ id, time, title, instructor, room, type, color }: any) {
  const colorMap: any = {
    primary: 'border-primary',
    tertiary: 'border-tertiary',
    secondary: 'border-secondary',
  };
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      className={cn('bg-surface-container-lowest rounded-3xl p-6 border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4', colorMap[color])}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold">{title}</h3>
          <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-primary tracking-widest uppercase">
            {type}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
          <div className="flex items-center gap-1.5"><Clock size={16} /> <span>{time}</span></div>
          <div className="flex items-center gap-1.5"><UserIcon size={16} /> <span>{instructor}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={16} /> <span>{room}</span></div>
        </div>
      </div>
      <Link
        to={`/schedule/class/${id ?? title.replace(/\s+/g, '-').toLowerCase()}`}
        className="bg-primary/5 text-primary font-bold px-6 py-2 rounded-xl hover:bg-primary/10 transition-all text-center"
      >
        View
      </Link>
    </motion.div>
  );
}
