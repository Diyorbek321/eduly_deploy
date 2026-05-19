import React, { useEffect, useState } from 'react';
import { Loader2, Trophy, Star, TrendingUp, Users, Medal } from 'lucide-react';
import api from '../lib/api';

interface KpiRecord {
  teacher_id: number;
  teacher_name: string;
  month: string;
  total_score: number;
  retention_score: number;
  homework_score: number;
  attendance_score: number;
  payment_score: number;
  bonus_tier: string | null;
  bonus_percent: number;
  student_count: number;
}

const TIER_STYLES: Record<string, { label: string; cls: string; icon: string }> = {
  platinum: { label: 'Platinum', cls: 'bg-violet-100 text-violet-700 border border-violet-200', icon: '💎' },
  gold:     { label: 'Gold',     cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200', icon: '🥇' },
  silver:   { label: 'Silver',   cls: 'bg-slate-100 text-slate-600 border border-slate-200',   icon: '🥈' },
};

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-slate-700">{value.toFixed(0)} / {max}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export const Staff = () => {
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/kpi/leaderboard', { params: { month } });
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setRecords(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
      </div>
    );
  }

  const topScore = records[0]?.total_score ?? 100;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">

      <div>
        <h1 className="text-xl font-black text-slate-900">O'qituvchi KPI</h1>
        <p className="text-sm text-slate-400 mt-0.5">{month} — reyting va bonuslar</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Jami o'qituvchi", value: records.length, icon: Users, accent: '#6366f1' },
          {
            label: 'Platinum / Gold',
            value: records.filter(r => r.bonus_tier === 'platinum' || r.bonus_tier === 'gold').length,
            icon: Trophy, accent: '#f59e0b',
          },
          {
            label: "O'rtacha ball",
            value: records.length
              ? (records.reduce((s, r) => s + r.total_score, 0) / records.length).toFixed(1)
              : '—',
            icon: Star, accent: '#10b981',
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              <p className="text-xs font-bold text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Trophy size={40} />
          <p className="font-bold">Bu oy uchun KPI ma'lumoti yo'q</p>
          <p className="text-sm">O'qituvchilar KPI hali hisoblanmagan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r, i) => {
            const tier = r.bonus_tier ? TIER_STYLES[r.bonus_tier] : null;
            const isExpanded = expanded === r.teacher_id;
            const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];

            return (
              <div
                key={r.teacher_id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : r.teacher_id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {/* Rank */}
                  <div className={`text-lg font-black w-8 text-center flex-shrink-0 ${rankColors[i] ?? 'text-slate-400'}`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                  </div>

                  {/* Avatar */}
                  <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center font-black text-sm text-[#ec5b13] flex-shrink-0">
                    {r.teacher_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + tier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900">{r.teacher_name}</p>
                      {tier && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.cls}`}>
                          {tier.icon} {tier.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{r.student_count} o'quvchi</p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black text-slate-900">{r.total_score.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">/ 100 ball</p>
                  </div>

                  {/* Bonus */}
                  {r.bonus_percent > 0 && (
                    <div className="hidden sm:flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0">
                      <TrendingUp size={12} />
                      +{r.bonus_percent}%
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="hidden md:block w-24 flex-shrink-0">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(r.total_score / 100) * 100}%`,
                          background: r.total_score >= 90 ? '#7c3aed' : r.total_score >= 75 ? '#f59e0b' : r.total_score >= 60 ? '#94a3b8' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
                    <ScoreBar label="Talabani ushlab turish" value={r.retention_score} max={30} color="#6366f1" />
                    <ScoreBar label="Uy vazifasi" value={r.homework_score} max={25} color="#f59e0b" />
                    <ScoreBar label="Davomat" value={r.attendance_score} max={25} color="#3b82f6" />
                    <ScoreBar label="To'lov" value={r.payment_score} max={20} color="#10b981" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
