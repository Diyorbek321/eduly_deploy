import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Users, ChevronRight, RefreshCw } from 'lucide-react';

import { cn } from '../lib/utils';
import api from '../lib/api';
import { encodeId } from '../lib/hashId';

interface LeaderboardRow {
  rank: number;
  teacher_id: number;
  teacher_name: string;
  teacher_avatar: string | null;
  specialty: string | null;
  month: string;
  total_score: number;
  bonus_tier: string;
  bonus_percent: number;
  retention_score: number;
  homework_score: number;
  attendance_score: number;
  payment_score: number;
  student_count: number;
}

const TIER_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  platinum: { label: 'Platinum', color: 'text-purple-700', bg: 'bg-purple-100', icon: '🏆' },
  gold:     { label: 'Gold',     color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '🥇' },
  silver:   { label: 'Silver',   color: 'text-slate-600',  bg: 'bg-slate-100',  icon: '🥈' },
  none:     { label: '—',        color: 'text-slate-400',  bg: 'bg-slate-50',   icon: '—'  },
};

const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  return `${MONTHS_UZ[parseInt(m) - 1]} ${y}`;
}

export const TeacherLeaderboard = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Generate last 6 months for selector
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value: val, label: monthLabel(val) };
  });

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/kpi/leaderboard', { params: { month: selectedMonth } });
      setRows(res.data || []);
    } catch {
      // intercepted
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalcAll = async () => {
    setCalculating(true);
    try {
      const teacherRes = await api.get('/teachers');
      const teachers = teacherRes.data.items || teacherRes.data || [];
      await Promise.allSettled(
        teachers.map((t: any) =>
          api.post(`/kpi/${t.id}/calculate`, null, { params: { month: selectedMonth } })
        )
      );
      await fetchLeaderboard();
    } catch {
      // intercepted
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  const ScoreBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.round((value / max) * 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black text-slate-600 w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">O'qituvchilar reytingi</h2>
            <p className="text-sm text-slate-500 mt-1">KPI ball asosida — davomat, uy vazifasi, saqlash, to'lov</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {monthOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleRecalcAll}
              disabled={calculating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ec5b13] hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <RefreshCw size={16} className={calculating ? 'animate-spin' : ''} />
              {calculating ? 'Hisoblanmoqda...' : 'Qayta hisoblash'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 font-bold">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Trophy className="mx-auto text-slate-200" size={48} />
            <p className="font-bold text-slate-400">Bu oy uchun KPI hisob-kitob qilinmagan</p>
            <p className="text-sm text-slate-400">Yuqoridagi "Qayta hisoblash" tugmasini bosing</p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((row, idx) => {
                  const podiumRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                  const actualRow = top3.find(r => r.rank === podiumRank);
                  if (!actualRow) return null;
                  const tier = TIER_META[actualRow.bonus_tier] ?? TIER_META.none;
                  const isFirst = actualRow.rank === 1;
                  return (
                    <div
                      key={actualRow.teacher_id}
                      onClick={() => navigate(`/teachers/${encodeId(String(actualRow.teacher_id))}`)}
                      className={cn(
                        "bg-white rounded-3xl border shadow-sm p-6 text-center cursor-pointer hover:shadow-md transition-all",
                        isFirst ? "border-yellow-300 ring-2 ring-yellow-200 md:-mt-4" : "border-slate-200"
                      )}
                    >
                      <div className="text-3xl mb-2">{actualRow.rank === 1 ? '🥇' : actualRow.rank === 2 ? '🥈' : '🥉'}</div>
                      <div className={cn(
                        "size-14 rounded-full mx-auto flex items-center justify-center text-lg font-black mb-3",
                        isFirst ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {actualRow.teacher_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <p className="font-black text-slate-900 text-sm">{actualRow.teacher_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{actualRow.specialty || 'O\'qituvchi'}</p>
                      <div className="mt-3">
                        <span className="text-2xl font-black text-slate-900">{actualRow.total_score.toFixed(1)}</span>
                        <span className="text-xs text-slate-400 ml-1">bal</span>
                      </div>
                      <span className={cn("mt-2 inline-block text-[10px] font-black px-2 py-0.5 rounded-full", tier.bg, tier.color)}>
                        {tier.icon} {tier.label} · +{actualRow.bonus_percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full rankings table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-black text-slate-700">Barchasi · {monthLabel(selectedMonth)}</p>
                <p className="text-xs text-slate-400">{rows.length} o'qituvchi</p>
              </div>
              <div className="divide-y divide-slate-50">
                {rows.map(row => {
                  const tier = TIER_META[row.bonus_tier] ?? TIER_META.none;
                  const scoreColor = row.total_score >= 90 ? '#8b5cf6' : row.total_score >= 75 ? '#f59e0b' : row.total_score >= 60 ? '#64748b' : '#ef4444';
                  return (
                    <div
                      key={row.teacher_id}
                      onClick={() => navigate(`/teachers/${encodeId(String(row.teacher_id))}`)}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <span className={cn(
                        "size-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0",
                        row.rank <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {row.rank}
                      </span>

                      <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                        {row.teacher_name.split(' ').map(n => n[0]).join('')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 truncate">{row.teacher_name}</p>
                          <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0", tier.bg, tier.color)}>
                            {tier.icon} {tier.label}
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-2">
                          <ScoreBar value={row.retention_score} max={30} color="#10b981" />
                          <ScoreBar value={row.homework_score} max={25} color="#3b82f6" />
                          <ScoreBar value={row.attendance_score} max={25} color="#f59e0b" />
                          <ScoreBar value={row.payment_score} max={20} color="#8b5cf6" />
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black" style={{ color: scoreColor }}>{row.total_score.toFixed(1)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{row.student_count} o'quvchi</p>
                        {row.bonus_percent > 0 && (
                          <p className="text-[10px] font-black text-emerald-600">+{row.bonus_percent}% bonus</p>
                        )}
                      </div>

                      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 text-[10px] font-bold text-slate-400">
                <span><span className="inline-block size-2 rounded-full bg-emerald-400 mr-1" />Saqlash (30)</span>
                <span><span className="inline-block size-2 rounded-full bg-blue-400 mr-1" />Uy vazifasi (25)</span>
                <span><span className="inline-block size-2 rounded-full bg-yellow-400 mr-1" />Davomat (25)</span>
                <span><span className="inline-block size-2 rounded-full bg-purple-400 mr-1" />To'lov (20)</span>
              </div>
            </div>

            {/* Bonus tiers explainer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { tier: 'platinum', range: '90–100', bonus: '+20%', desc: 'Platinum' },
                { tier: 'gold',     range: '75–89',  bonus: '+12%', desc: 'Gold' },
                { tier: 'silver',   range: '60–74',  bonus: '+6%',  desc: 'Silver' },
                { tier: 'none',     range: '<60',    bonus: '0%',   desc: 'Bonus yo\'q' },
              ].map(t => {
                const meta = TIER_META[t.tier];
                return (
                  <div key={t.tier} className={cn("p-4 rounded-2xl border text-center", meta.bg, "border-transparent")}>
                    <p className="text-lg">{meta.icon}</p>
                    <p className={cn("font-black text-sm mt-1", meta.color)}>{t.desc}</p>
                    <p className="text-xs text-slate-500 font-medium">{t.range} bal</p>
                    <p className={cn("text-base font-black mt-1", meta.color)}>{t.bonus}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
