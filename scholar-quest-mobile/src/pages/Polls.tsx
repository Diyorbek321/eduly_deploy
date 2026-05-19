import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Loader2, BarChart2 } from 'lucide-react';
import { api, apiRequest } from '../lib/api';

interface PollOption {
  id: number;
  emoji: string;
  label: string;
  position: number;
  count: number;
  percent: number;
}

interface Poll {
  id: number;
  title: string;
  description: string | null;
  status: string;
  ends_at: string | null;
  options: PollOption[];
  total_responses: number;
  my_option_id: number | null;
}

function ResultBar({ opt, total, isMyVote }: { opt: PollOption; total: number; isMyVote: boolean }) {
  const pct = total ? Math.round((opt.count / total) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-2xl p-3 border-2 transition-colors ${isMyVote ? 'border-primary bg-primary/5' : 'border-transparent bg-surface'}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{opt.emoji}</span>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-on-surface">{opt.label}</span>
            <div className="flex items-center gap-1">
              {isMyVote && <CheckCircle2 size={14} className="text-primary" />}
              <span className="text-xs font-bold text-muted">{pct}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-2 bg-outline-variant rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </motion.div>
  );
}

function PollCard({ poll: initialPoll }: { poll: Poll }) {
  const [poll, setPoll] = useState(initialPoll);
  const [voting, setVoting] = useState<number | null>(null);
  const [voted, setVoted] = useState(initialPoll.my_option_id !== null);

  const vote = async (optionId: number) => {
    if (voted || voting) return;
    setVoting(optionId);
    try {
      const updated = await apiRequest<Poll>(`/polls/${poll.id}/vote`, {
        method: 'POST',
        query: { option_id: optionId },
      });
      if (updated) setPoll(updated);
      setVoted(true);
    } catch {
      // already voted or other error — still mark as voted to prevent repeated attempts
    } finally {
      setVoting(null);
    }
  };

  const isExpired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const canVote = !voted && !isExpired && poll.status === 'active';

  return (
    <motion.div
      layout
      className="bg-surface-container rounded-3xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            {poll.status === 'active' && !isExpired
              ? <span className="flex items-center gap-1 text-emerald-400 font-bold"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />Faol</span>
              : <span className="flex items-center gap-1 font-bold text-muted"><Clock size={11} />Yakunlangan</span>
            }
          </div>
          <span className="flex items-center gap-1 text-xs text-muted">
            <BarChart2 size={12} /> {poll.total_responses} ovoz
          </span>
        </div>
        <h3 className="text-base font-black text-on-surface leading-snug">{poll.title}</h3>
        {poll.description && (
          <p className="text-sm text-muted leading-relaxed">{poll.description}</p>
        )}
      </div>

      {/* Options / Results */}
      <AnimatePresence mode="wait">
        {voted || !canVote ? (
          // Results view
          <motion.div key="results" className="space-y-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {poll.total_responses === 0 ? (
              <p className="text-center text-sm text-muted py-3">Hali ovoz yo'q</p>
            ) : (
              poll.options.map(opt => (
                <ResultBar key={opt.id} opt={opt} total={poll.total_responses} isMyVote={poll.my_option_id === opt.id} />
              ))
            )}
            {voted && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 pt-1 text-sm text-primary font-bold">
                <CheckCircle2 size={15} /> Ovozingiz qabul qilindi
              </motion.div>
            )}
          </motion.div>
        ) : (
          // Voting view
          <motion.div key="vote" className="grid grid-cols-2 gap-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {poll.options.map(opt => (
              <motion.button
                key={opt.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => vote(opt.id)}
                disabled={voting !== null}
                className="relative flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl bg-surface border-2 border-outline-variant hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-60"
              >
                {voting === opt.id ? (
                  <Loader2 size={28} className="animate-spin text-primary" />
                ) : (
                  <span className="text-3xl leading-none">{opt.emoji}</span>
                )}
                <span className="text-xs font-bold text-on-surface text-center leading-tight">{opt.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<Poll[]>('/polls/student/active');
        setPolls(Array.isArray(data) ? data : []);
      } catch {
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span>Yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-20"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface">So'rovnomalar</h1>
          <p className="text-sm text-muted mt-0.5">{polls.length} ta so'rovnoma</p>
        </div>
        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BarChart2 size={20} className="text-primary" />
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted gap-4">
          <div className="size-16 rounded-3xl bg-surface-container flex items-center justify-center">
            <BarChart2 size={32} className="text-muted" />
          </div>
          <div className="text-center">
            <p className="font-bold text-on-surface mb-1">So'rovnomalar yo'q</p>
            <p className="text-sm">Admin yangi so'rovnoma qo'shganda bu yerda ko'rinadi</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
