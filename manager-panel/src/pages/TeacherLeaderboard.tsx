import React, { useEffect, useState } from 'react';
import { Trophy, Loader2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import api from '../lib/api';

interface KpiEntry {
  teacher_id: number;
  teacher_name: string;
  total_score: number;
  tier: string;
  bonus_percent: number;
  scores: {
    retention: number;
    homework: number;
    attendance: number;
    payment: number;
  };
}

const TIER_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Platinum': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  'Gold':     { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Silver':   { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  'Bronze':   { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
};

const SCORE_BARS = [
  { key: 'retention' as const,  label: "Ushlab qolish", max: 30, color: '#6366f1' },
  { key: 'homework' as const,   label: "Uy ishi",        max: 25, color: '#10b981' },
  { key: 'attendance' as const, label: "Davomat",         max: 25, color: '#f59e0b' },
  { key: 'payment' as const,    label: "To'lov",          max: 20, color: '#ec5b13' },
];

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const TeacherLeaderboard = () => {
  const [data, setData] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/kpi/leaderboard', { params: { month } });
        const arr = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.data ?? []);
        setData(arr);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  const toggleExpand = (id: number) => setExpanded(prev => prev === id ? null : id);

  const rankIcon = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Trophy size={20} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">O'qituvchi reytingi</h1>
            <p className="text-sm text-slate-400">KPI ko'rsatkichlari</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-slate-400" />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          Bu oy uchun ma'lumot topilmadi
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((entry, idx) => {
            const tier = TIER_STYLE[entry.tier] ?? TIER_STYLE['Silver'];
            const isOpen = expanded === entry.teacher_id;
            return (
              <div key={entry.teacher_id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isOpen ? 'border-orange-200' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => toggleExpand(entry.teacher_id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* Rank */}
                  <div className="text-lg w-8 text-center flex-shrink-0 font-black text-slate-400">
                    {rankIcon(idx)}
                  </div>
                  {/* Avatar */}
                  <div className="size-10 rounded-xl bg-purple-50 flex items-center justify-center font-black text-purple-400 flex-shrink-0">
                    {entry.teacher_name.charAt(0).toUpperCase()}
                  </div>
                  {/* Name + tier */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{entry.teacher_name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.text} ${tier.border}`}>
                      {entry.tier}
                    </span>
                  </div>
                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-slate-900">{entry.total_score}<span className="text-xs font-normal text-slate-400">/100</span></p>
                    <p className="text-xs text-emerald-600 font-bold">+{entry.bonus_percent}% bonus</p>
                  </div>
                  {/* Expand icon */}
                  <div className="text-slate-300 flex-shrink-0">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Breakdown */}
                {isOpen && entry.scores && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                    {SCORE_BARS.map(bar => {
                      const val = entry.scores[bar.key] ?? 0;
                      const pct = Math.round((val / bar.max) * 100);
                      return (
                        <div key={bar.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-600">{bar.label}</span>
                            <span className="text-xs font-black" style={{ color: bar.color }}>{val}/{bar.max}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: bar.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
