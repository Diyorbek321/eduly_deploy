import { Trophy, ChevronUp, Star, Globe, Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocale } from '../context/LocaleContext';
import { useStudent } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { rewardService } from '../services/studentService';

type Scope = 'Global' | 'Branch' | 'Circle';
type Timeframe = 'Daily' | 'Weekly' | 'Circle';

interface RankEntry {
  rank: string;
  name: string;
  points: string;
  img: string;
  isUser?: boolean;
  trend?: 'up' | 'down';
}

const baseRankings: Record<Scope, RankEntry[]> = {
  Global: [
    { rank: '04', name: 'Alex Johnston', points: '10,540', img: 'https://picsum.photos/seed/alex/100' },
    { rank: '05', name: 'Sarah Miller', points: '9,810', img: 'https://picsum.photos/seed/sarah/100' },
    { rank: '06', name: 'You', points: '9,420', img: 'https://picsum.photos/seed/you/100', isUser: true, trend: 'up' },
    { rank: '07', name: 'Liam Carter', points: '8,900', img: 'https://picsum.photos/seed/liam/100' },
    { rank: '08', name: 'Maya Angel', points: '8,550', img: 'https://picsum.photos/seed/maya/100' },
  ],
  Branch: [
    { rank: '01', name: 'James Wilson', points: '11,200', img: 'https://picsum.photos/seed/james/100' },
    { rank: '02', name: 'You', points: '9,420', img: 'https://picsum.photos/seed/you/100', isUser: true, trend: 'up' },
    { rank: '03', name: 'Oliver Twist', points: '8,100', img: 'https://picsum.photos/seed/oliver/100' },
    { rank: '04', name: 'Emma Watson', points: '7,950', img: 'https://picsum.photos/seed/emma/100' },
    { rank: '05', name: 'Noah Ark', points: '7,200', img: 'https://picsum.photos/seed/noah/100' },
  ],
  Circle: [
    { rank: '01', name: 'Sofia Chen', points: '14,200', img: 'https://picsum.photos/seed/sofia/100' },
    { rank: '02', name: 'Marcus Bell', points: '12,800', img: 'https://picsum.photos/seed/marcus/100' },
    { rank: '03', name: 'You', points: '9,420', img: 'https://picsum.photos/seed/you/100', isUser: true, trend: 'up' },
    { rank: '04', name: 'Julian V.', points: '8,600', img: 'https://picsum.photos/seed/julian/100' },
    { rank: '05', name: 'Elena Rose', points: '7,100', img: 'https://picsum.photos/seed/elena/100' },
  ]
};

// Apply a scaling factor per timeframe so filters visibly change the data.
const timeframeMultiplier: Record<Timeframe, number> = {
  Daily: 0.15,
  Weekly: 1,
  Circle: 1,
};

function applyTimeframe(entries: RankEntry[], tf: Timeframe): RankEntry[] {
  const factor = timeframeMultiplier[tf];
  return entries
    .map(e => {
      const numeric = Math.round(parseFloat(e.points.replace(/,/g, '')) * factor);
      return { ...e, points: numeric.toLocaleString('en-US') };
    })
    .sort((a, b) => parseFloat(b.points.replace(/,/g, '')) - parseFloat(a.points.replace(/,/g, '')))
    .map((e, i) => ({ ...e, rank: String(i + 1).padStart(2, '0') }));
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Weekly');
  const { t } = useLocale();
  const { profile } = useStudent();
  const { user } = useAuth();
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;
    let cancelled = false;
    rewardService.wallet()
      .then(w => { if (!cancelled) setCoins(w.coins); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  const scope: Scope = timeframe === 'Circle' ? 'Circle' : 'Global';

  const rankings = useMemo<RankEntry[]>(() => {
    const myName = profile?.name ?? user?.name ?? 'You';
    const myEntry: RankEntry = {
      rank: '01',
      name: myName,
      points: coins.toLocaleString('en-US'),
      img: profile?.avatar || `https://picsum.photos/seed/u${user?.id ?? 'me'}/100`,
      isUser: true,
    };
    return [myEntry];
  }, [profile, user, coins, scope, timeframe]);

  const podium = rankings.slice(0, 3);
  const list = rankings;

  const tfLabel: Record<Timeframe, string> = {
    Daily: t('rank.daily'),
    Weekly: t('rank.weekly'),
    Circle: t('rank.circle'),
  };

  const tfIcon: Record<Timeframe, ReactNode> = {
    Daily: <Globe size={14} />,
    Weekly: <Building2 size={14} />,
    Circle: <ShieldCheck size={14} />,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-12 pb-32 pt-4"
    >
      <motion.section variants={itemVariants} className="space-y-8">
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{tfLabel[timeframe]}</span>
            <h2 className="text-3xl font-headline font-extrabold text-on-surface">{t('rank.title')}</h2>
          </div>

          {/* Filter buttons — Daily / Weekly / Circle */}
          <div
            role="tablist"
            aria-label="Leaderboard filters"
            className="grid grid-cols-3 gap-2 bg-surface-container-low p-1.5 rounded-3xl"
          >
            {(['Daily', 'Weekly', 'Circle'] as const).map((tab) => {
              const isActive = timeframe === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTimeframe(tab)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95',
                    isActive
                      ? 'bg-white text-primary shadow-md ring-2 ring-primary/30'
                      : 'hover:bg-surface-container-high text-on-surface-variant'
                  )}
                >
                  {tfIcon[tab]}
                  {tfLabel[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Podium */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mt-20 mb-4">
            <PodiumItem rank={2} {...podium[1]} height="h-24" />
            <PodiumItem rank={1} {...podium[0]} height="h-32" featured />
            <PodiumItem rank={3} {...podium[2]} height="h-20" />
          </div>
        )}
      </motion.section>

      {/* List — isolated scroll container so dragging it doesn't move the page */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex justify-between px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
          <span>Rank & Student</span>
          <span>Points</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={timeframe}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {list.length === 0 && (
              <div className="bg-surface-container-low rounded-3xl p-8 text-center text-on-surface-variant">
                {t('rank.empty')}
              </div>
            )}
            {list.map(item => (
              <motion.div
                key={item.name}
                whileHover={{ x: 12 }}
                className={cn(
                  'flex items-center justify-between p-4 rounded-3xl transition-all cursor-pointer',
                  item.isUser
                    ? 'bg-primary/10 border-2 border-primary/20 shadow-sm z-20'
                    : 'bg-white border border-surface-container/50 shadow-sm'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-6 flex flex-col items-center">
                    <span className={cn('font-headline font-black', item.isUser ? 'text-primary' : 'text-on-surface-variant/40')}>
                      {item.rank}
                    </span>
                    {item.trend === 'up' && <ChevronUp size={12} className="text-primary" />}
                  </div>
                  <img className={cn('w-10 h-10 rounded-full object-cover', item.isUser && 'border-2 border-primary')} src={item.img} alt={item.name} />
                  <div className="flex flex-col">
                    <span className={cn('font-bold text-sm', item.isUser && 'text-primary')}>{item.name}</span>
                    {item.isUser && <span className="text-[10px] text-primary/70 font-black uppercase tracking-tighter">Current Rank</span>}
                  </div>
                </div>
                <div className={cn('font-headline font-black', item.isUser ? 'text-primary' : 'text-on-surface')}>
                  {item.points}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      {/* Privacy Toggle */}
      <motion.section variants={itemVariants} className="flex items-center justify-between p-6 bg-surface-container-low rounded-4xl border border-surface-container">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-on-surface-variant shadow-sm">
            <Star size={20} className="text-tertiary" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface">Show my rank to others</h3>
            <p className="text-xs text-on-surface-variant">Your progress is visible in the selected scope.</p>
          </div>
        </div>
        <div className="w-14 h-8 bg-primary rounded-full relative p-1 cursor-pointer">
          <div className="w-6 h-6 bg-white rounded-full translate-x-6 transition-transform" />
        </div>
      </motion.section>
    </motion.div>
  );
}

function PodiumItem({ rank, name, points, height, img, featured }: any) {
  return (
    <div className={cn('flex flex-col items-center w-1/3', featured && 'z-10 scale-110')}>
      <div className="relative mb-4">
        {featured && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-tertiary">
            <Trophy size={32} fill="currentColor" />
          </div>
        )}
        <div className={cn(
          'rounded-full p-1 transition-transform',
          featured ? 'w-20 h-20 premium-gradient' : 'w-16 h-16 bg-surface-container-highest'
        )}>
          <img className="w-full h-full rounded-full object-cover border-2 border-white" src={img} alt={name} />
        </div>
        <div className={cn(
          'absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white',
          featured ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface'
        )}>
          {rank}
        </div>
      </div>
      <div className={cn(
        'w-full rounded-t-3xl flex flex-col items-center justify-center p-2 text-center shadow-lg',
        height,
        featured ? 'premium-gradient text-white' : 'bg-white border-x border-t border-surface-container'
      )}>
        <p className="font-bold text-xs truncate w-full">{name}</p>
        <p className={cn('font-black text-[10px]', featured ? 'text-primary-container' : 'text-primary')}>{points} pts</p>
      </div>
    </div>
  );
}
