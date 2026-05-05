import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, XCircle, Coins, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { studentService, type MyHomework, type MyHomeworkItem } from '../services/studentService';
import { useLocale } from '../context/LocaleContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type Filter = 'all' | 'pending' | 'done' | 'not_done';

export default function Homework() {
  const { t } = useLocale();
  const [data, setData] = useState<MyHomework | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await studentService.homework();
        if (alive) setData(res);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = data?.items ?? [];
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-6 pb-32"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('homework.title')}</h1>
          <p className="text-on-surface-variant text-sm">{t('homework.subtitle')}</p>
        </div>
      </motion.div>

      {data && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <Stat label={t('homework.pending')} value={data.pending} accent="text-tertiary" />
          <Stat label={t('homework.done')} value={data.done} accent="text-secondary" />
          <Stat label={t('homework.totalCount')} value={data.total} accent="text-primary" />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2 bg-surface-container-low p-1.5 rounded-3xl">
        {(['all', 'pending', 'done', 'not_done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'py-2.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95',
              filter === f
                ? 'bg-white text-primary shadow-md ring-2 ring-primary/30'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            {t(`homework.filter.${f}`)}
          </button>
        ))}
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="rounded-3xl bg-error/10 text-error px-6 py-4 text-sm font-bold">
          {error}
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          <Loader2 className="animate-spin" size={24} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div variants={itemVariants} className="bg-surface-container-low rounded-4xl p-12 text-center">
          <BookOpen size={36} className="mx-auto text-on-surface-variant/40 mb-3" />
          <p className="font-bold text-on-surface-variant">{t('homework.empty')}</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {filtered.map(hw => (
          <motion.div key={hw.id} variants={itemVariants}>
            <HomeworkCard hw={hw} t={t} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-3xl p-4 text-center border border-surface-container/50 shadow-sm">
      <div className={cn('text-2xl font-black', accent)}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{label}</div>
    </div>
  );
}

function HomeworkCard({ hw, t }: { hw: MyHomeworkItem; t: (k: string) => string }) {
  const statusMeta = {
    pending: { label: t('homework.status.pending'), icon: <Clock size={14} />, cls: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    done:    { label: t('homework.status.done'),    icon: <CheckCircle2 size={14} />, cls: 'bg-secondary/10 text-secondary border-secondary/20' },
    not_done:{ label: t('homework.status.notDone'), icon: <XCircle size={14} />, cls: 'bg-error/10 text-error border-error/20' },
  }[hw.status];

  return (
    <div className="bg-white rounded-3xl p-5 border border-surface-container/50 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{hw.title}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {hw.course_name || hw.group_name} • {hw.teacher_name}
          </p>
        </div>
        <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', statusMeta.cls)}>
          {statusMeta.icon}
          {statusMeta.label}
        </span>
      </div>

      {hw.description && (
        <p className="mt-3 text-sm text-on-surface-variant line-clamp-3">{hw.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-on-surface-variant">
          {hw.due_date && (
            <span>{t('homework.due')}: <span className="font-bold text-on-surface">{hw.due_date}</span></span>
          )}
        </div>
        <div className={cn(
          'flex items-center gap-1 font-bold',
          hw.status === 'done' && hw.coins_awarded > 0 ? 'text-secondary' : 'text-tertiary'
        )}>
          <Coins size={14} />
          {hw.status === 'done' && hw.coins_awarded > 0
            ? `+${hw.coins_awarded}`
            : hw.coin_reward}
        </div>
      </div>
    </div>
  );
}
