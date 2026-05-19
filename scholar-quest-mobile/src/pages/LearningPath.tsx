import { CheckCircle2, Lock, Trophy, ArrowLeft, AlertTriangle, Clock, Brain, Zap, Star, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTutor } from '../context/TutorContext';
import { studentService } from '../services/studentService';
import { api } from '../lib/api';
import type { LearningPathItem } from '../lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestInfo {
  quest_id: number;
  completed: boolean;
  score: number | null;
  coins_awarded: boolean;
}

interface ModuleInfo {
  id: number;
  name: string;
  level_order: number;
  description: string | null;
  is_current: boolean;
  is_completed: boolean;
  is_locked: boolean;
  quest_today: QuestInfo | null;
}

interface CoursePathInfo {
  course_id: number;
  course_name: string;
  modules: ModuleInfo[];
  total_modules: number;
  current_level_order: number;
}

// ─── Shared components ────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 120, stroke = 8, color = 'text-primary' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, pct) / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="currentColor"
        strokeWidth={stroke} className="text-surface-container-high" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="currentColor"
        strokeWidth={stroke} strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round"
        className={color} />
    </svg>
  );
}

// ─── MODULE PATH TAB ──────────────────────────────────────────────────────────

const MODULE_EMOJIS = ['🌱', '🌿', '🌳', '🌟', '🏆', '💎', '🚀', '⭐', '🔥', '✨'];

function ModuleNode({
  mod, index, isLast, navigate,
}: {
  mod: ModuleInfo; index: number; isLast: boolean; navigate: (p: string) => void;
}) {
  const emoji = MODULE_EMOJIS[index % MODULE_EMOJIS.length];
  const questDone = mod.quest_today?.completed;
  const questScore = mod.quest_today?.score;
  const questAvailable = mod.quest_today && !mod.is_locked;

  // Node color
  const nodeColor = mod.is_completed
    ? 'bg-emerald-500'
    : mod.is_current
      ? 'bg-primary'
      : 'bg-outline-variant/50';

  // Card style
  const cardCls = mod.is_current
    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
    : mod.is_completed
      ? 'border-emerald-200/60 bg-emerald-50/50'
      : 'border-outline-variant/30 bg-surface-container/40';

  const isLeft = index % 2 === 0;

  return (
    <div className="relative flex items-center gap-0">
      {/* Left card or spacer */}
      <div className="flex-1 flex justify-end pr-4">
        {isLeft ? (
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className={`w-44 rounded-2xl border p-3.5 ${cardCls} ${mod.is_locked ? 'opacity-40' : ''}`}
          >
            <ModuleCardContent mod={mod} questDone={questDone} questScore={questScore}
              questAvailable={!!questAvailable} navigate={navigate} />
          </motion.div>
        ) : <div className="w-44" />}
      </div>

      {/* Center node */}
      <div className="flex flex-col items-center z-10 relative">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.08 + 0.1, type: 'spring', stiffness: 260 }}
          className={`size-14 rounded-full flex items-center justify-center shadow-md ${nodeColor} ${
            mod.is_current ? 'ring-4 ring-primary/30 ring-offset-2' : ''
          }`}
        >
          {mod.is_locked
            ? <Lock size={20} className="text-white/50" />
            : mod.is_completed
              ? <CheckCircle2 size={22} className="text-white" />
              : <span className="text-2xl leading-none">{emoji}</span>}
        </motion.div>
        {mod.is_current && (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -bottom-1 text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            Hozir
          </motion.div>
        )}
      </div>

      {/* Right card or spacer */}
      <div className="flex-1 flex justify-start pl-4">
        {!isLeft ? (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className={`w-44 rounded-2xl border p-3.5 ${cardCls} ${mod.is_locked ? 'opacity-40' : ''}`}
          >
            <ModuleCardContent mod={mod} questDone={questDone} questScore={questScore}
              questAvailable={!!questAvailable} navigate={navigate} />
          </motion.div>
        ) : <div className="w-44" />}
      </div>
    </div>
  );
}

function ModuleCardContent({ mod, questDone, questScore, questAvailable, navigate }: {
  mod: ModuleInfo;
  questDone: boolean | undefined;
  questScore: number | null | undefined;
  questAvailable: boolean;
  navigate: (p: string) => void;
}) {
  return (
    <div>
      <p className={`text-sm font-black leading-tight ${
        mod.is_current ? 'text-primary' : mod.is_locked ? 'text-muted' : 'text-on-surface'
      }`}>{mod.name}</p>

      {mod.description && (
        <p className="text-[10px] text-muted mt-0.5 line-clamp-2">{mod.description}</p>
      )}

      {/* Quest pill */}
      {!mod.is_locked && (
        <div className="mt-2">
          {questAvailable ? (
            <button
              type="button"
              onClick={() => !mod.is_locked && navigate('/daily-quest')}
              className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                questDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {questDone ? (
                <><CheckCircle2 size={10} />{questScore}/10</>
              ) : (
                <><Zap size={10} />Quest<ChevronRight size={10} /></>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-muted/60">Quest yo'q</span>
          )}
        </div>
      )}
    </div>
  );
}

function CoursePath({ course, navigate }: { course: CoursePathInfo; navigate: (p: string) => void }) {
  const completedCount = course.modules.filter(m => m.is_completed).length;
  const progressPct = Math.round((completedCount / course.total_modules) * 100);

  return (
    <div className="space-y-6">
      {/* Course header */}
      <div className="bg-surface-container rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-black text-on-surface">{course.course_name}</h3>
            <p className="text-xs text-muted mt-0.5">
              {completedCount}/{course.total_modules} daraja bajarildi
            </p>
          </div>
          <div className="relative size-14">
            <ProgressRing pct={progressPct} size={56} stroke={5} color="text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-primary">{progressPct}%</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Module path */}
      <div className="relative">
        {/* Center spine */}
        <div className="absolute left-1/2 top-7 bottom-7 w-0.5 -translate-x-1/2 bg-outline-variant/30 rounded-full" />
        {/* Progress fill */}
        <div
          className="absolute left-1/2 top-7 w-0.5 -translate-x-1/2 bg-primary/50 rounded-full transition-all duration-1000"
          style={{ height: `${progressPct}%` }}
        />

        <div className="space-y-8">
          {course.modules.map((mod, i) => (
            <ModuleNode key={mod.id} mod={mod} index={i}
              isLast={i === course.modules.length - 1} navigate={navigate} />
          ))}

          {/* Trophy end node */}
          <div className="flex items-center justify-center py-4">
            <div className={`size-14 rounded-full flex items-center justify-center border-2 border-dashed ${
              progressPct === 100
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-outline-variant/40 bg-transparent'
            }`}>
              <Trophy size={24} className={progressPct === 100 ? 'text-yellow-500' : 'text-muted/40'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModulePathTab() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CoursePathInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState(0);

  useEffect(() => {
    (api.get('/daily-quests/module-path') as Promise<any>)
      .then((data: any) => {
        const list = data?.courses ?? data?.data?.courses ?? [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
          <Brain size={28} className="text-primary" />
        </motion.div>
        <span className="ml-3">Yuklanmoqda...</span>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted gap-4">
        <div className="size-20 rounded-3xl bg-surface-container flex items-center justify-center">
          <Lock size={32} className="text-muted/40" />
        </div>
        <div className="text-center">
          <p className="font-bold text-on-surface mb-1">Modul yo'li topilmadi</p>
          <p className="text-sm">Siz hali hech qaysi modulga biriktirilmagansiz.<br />
            Guruhga qo'shilganda avtomatik biriktiriladi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course tabs if multiple courses */}
      {courses.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {courses.map((c, i) => (
            <button
              key={c.course_id}
              type="button"
              onClick={() => setActiveCourse(i)}
              className={`px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                activeCourse === i
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-muted'
              }`}
            >
              {c.course_name}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCourse}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <CoursePath course={courses[activeCourse]} navigate={navigate} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── GROUPS TAB (original content) ───────────────────────────────────────────

function GroupCard({ item, index }: { item: LearningPathItem; index: number }) {
  const hasTarget = item.target_completion_date !== null;
  const daysLeft = item.days_remaining;
  const overdue = daysLeft !== null && daysLeft < 0;
  const isFirst = index === 0;

  return (
    <div className={cn('flex items-center gap-8 w-full', index % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}>
      <div className="w-1/2">
        <div className={cn(
          'p-5 rounded-3xl shadow-sm border',
          isFirst ? 'bg-primary-container/10 border-primary/20 scale-105' : 'bg-white border-surface-container',
          overdue && 'border-red-200 bg-red-50',
          index % 2 === 0 ? 'text-right' : 'text-left',
        )}>
          <h3 className={cn('font-bold text-base', isFirst && !overdue && 'text-primary', overdue && 'text-red-600')}>
            {item.group_name}
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{item.course_name}</p>
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{item.teacher_name}</p>
          {hasTarget && (
            <div className={cn(
              'mt-3 flex items-center gap-1.5 text-[10px] font-bold rounded-lg px-2 py-1 w-fit',
              index % 2 === 0 ? 'ml-auto' : '',
              overdue ? 'bg-red-100 text-red-600'
                : daysLeft !== null && daysLeft <= 30 ? 'bg-amber-100 text-amber-600'
                  : 'bg-primary/5 text-primary border border-primary/10',
            )}>
              <Clock size={10} />
              {overdue ? `${Math.abs(daysLeft!)} kun kechikdi` : daysLeft !== null ? `${daysLeft} kun qoldi` : ''}
            </div>
          )}
          {item.is_behind && (
            <div className={cn('mt-2 flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-lg px-2 py-1 w-fit', index % 2 === 0 ? 'ml-auto' : '')}>
              <AlertTriangle size={10} /> Orqada qolmoqda
            </div>
          )}
          {item.homework_total > 0 && (
            <div className="mt-3 space-y-1">
              <div className={cn('flex justify-between text-[10px] text-on-surface-variant', index % 2 === 0 ? 'flex-row-reverse' : '')}>
                <span>Uyga vazifa</span>
                <span className="font-bold">{item.homework_done}/{item.homework_total}</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${item.homework_pct}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative z-10 w-20 h-20 shrink-0">
        <div className={cn(
          'w-full h-full rounded-full flex items-center justify-center shadow-lg',
          overdue ? 'bg-red-500 scale-105' : isFirst ? 'premium-gradient scale-110 active-pulse' : 'premium-gradient',
        )}>
          {overdue
            ? <AlertTriangle size={28} className="text-white" />
            : isFirst
              ? <span className="text-white font-black text-2xl">{Math.round(item.time_progress_pct)}%</span>
              : <CheckCircle2 size={28} className="text-white fill-white/20" />}
        </div>
      </div>
      <div className="w-1/2" />
    </div>
  );
}

function GroupsTab() {
  const [items, setItems] = useState<LearningPathItem[]>([]);
  const [loading, setLoading] = useState(true);

  const avgHwPct = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.homework_pct, 0) / items.length)
    : 0;

  useEffect(() => {
    studentService.learningPath()
      .then(d => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12">
      {/* Overall progress */}
      <div className="bg-white rounded-4xl p-8 flex flex-col items-center justify-center relative shadow-sm border border-surface-container">
        <div className="relative w-32 h-32 mb-6 text-on-surface">
          <ProgressRing pct={avgHwPct} size={128} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black text-primary">
              {loading ? '…' : `${avgHwPct}%`}
            </motion.span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Bajarildi</span>
          </div>
        </div>
        <p className="text-on-surface-variant text-sm font-medium">
          {loading ? 'Yuklanmoqda…'
            : items.length === 0 ? 'Hozircha guruhga yozilmagan'
              : `${items.length} ta kurs • Uyga vazifa tahlili`}
        </p>
        {items.some(i => i.is_behind) && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-600">Ba'zi kurslarda orqada qolmoqdasiz</span>
          </div>
        )}
      </div>

      {/* Roadmap */}
      {!loading && items.length > 0 && (
        <div className="relative py-12">
          <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-surface-container-high rounded-full">
            <div className="w-full bg-primary rounded-full shadow-[0_0_12px_rgba(70,71,211,0.4)]"
              style={{ height: `${avgHwPct}%` }} />
          </div>
          <div className="space-y-24">
            {items.map((item, idx) => <GroupCard key={item.group_id} item={item} index={idx} />)}
            <div className="flex flex-col items-center gap-4 opacity-40">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-tertiary-container flex items-center justify-center">
                <Trophy size={40} className="text-tertiary-container" />
              </div>
              <span className="font-black text-xs uppercase tracking-[0.2em] text-tertiary-container">Yakuniy maqsad</span>
            </div>
          </div>
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <Lock size={48} className="mx-auto text-on-surface-variant/30" />
          <p className="text-on-surface-variant font-medium">Hali birorta guruhga yozilmagansiz</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LearningPath() {
  const { setContext } = useTutor();
  const [tab, setTab] = useState<'modules' | 'groups'>('modules');

  useEffect(() => {
    setContext('Learning path with module progression');
    return () => setContext('General Study');
  }, [setContext]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6 pb-32"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/learn" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-headline">O'quv yo'lim</h1>
          <p className="text-xs text-muted mt-0.5">Kurs modullari bo'yicha progress</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-surface-container rounded-2xl p-1">
        <button
          type="button"
          onClick={() => setTab('modules')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            tab === 'modules' ? 'bg-primary text-white shadow-sm' : 'text-muted'
          }`}
        >
          <Brain size={15} /> Modullar yo'li
        </button>
        <button
          type="button"
          onClick={() => setTab('groups')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            tab === 'groups' ? 'bg-primary text-white shadow-sm' : 'text-muted'
          }`}
        >
          <Star size={15} /> Guruhlar
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'modules' ? <ModulePathTab /> : <GroupsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
