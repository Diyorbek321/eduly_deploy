import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, Clock, Users } from 'lucide-react';
import api from '../lib/api';

interface Group {
  id: number;
  name: string;
  schedule?: string;
  time?: string;
  teacher_name?: string;
  course_name?: string;
  students_count?: number;
  status?: string;
}

const DAYS_UZ = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const DAY_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#3b82f6',
  '#ec5b13', '#8b5cf6', '#ef4444',
];

function parseSchedule(schedule: string): string[] {
  if (!schedule) return [];
  return schedule.split(',').map(d => d.trim());
}

export const Schedule = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('week');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/groups');
        const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setGroups(data.filter((g: Group) => g.status !== 'Tugagan'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Map day -> groups
  const dayGroups: Record<string, Group[]> = {};
  DAYS_UZ.forEach(d => { dayGroups[d] = []; });
  groups.forEach(g => {
    const days = parseSchedule(g.schedule ?? '');
    days.forEach(day => {
      const match = DAYS_UZ.find(d => day.toLowerCase().includes(d.toLowerCase()));
      if (match) dayGroups[match].push(g);
    });
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Calendar size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Dars jadvali</h1>
            <p className="text-sm text-slate-400">{groups.length} ta faol guruh</p>
          </div>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-4 py-2 text-xs font-bold transition-colors ${view === 'week' ? 'bg-[#ec5b13] text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Haftalik
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-4 py-2 text-xs font-bold transition-colors ${view === 'list' ? 'bg-[#ec5b13] text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Ro'yxat
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : view === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS_UZ.map((day, idx) => (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100" style={{ borderLeftWidth: 3, borderLeftColor: DAY_COLORS[idx] }}>
                <p className="text-xs font-black text-slate-700">{day}</p>
                <p className="text-[10px] text-slate-400">{dayGroups[day].length} ta dars</p>
              </div>
              <div className="p-2 space-y-1.5 min-h-[80px]">
                {dayGroups[day].length === 0 ? (
                  <p className="text-[10px] text-slate-300 text-center py-4">—</p>
                ) : dayGroups[day].map(g => (
                  <div key={g.id} className="rounded-lg px-2 py-1.5 text-[10px]" style={{ background: `${DAY_COLORS[idx]}12`, borderLeft: `2px solid ${DAY_COLORS[idx]}` }}>
                    <p className="font-black text-slate-800 truncate">{g.name}</p>
                    {g.time && <p className="text-slate-400 flex items-center gap-0.5 mt-0.5"><Clock size={8} />{g.time}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Guruh</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">O'qituvchi</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Jadval</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Vaqt</th>
                <th className="text-center px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">O'quvchilar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groups.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Guruh topilmadi</td></tr>
              ) : groups.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-bold text-slate-900">{g.name}</p>
                      {g.course_name && <p className="text-xs text-slate-400">{g.course_name}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{g.teacher_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{g.schedule ?? '—'}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {g.time && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} /> {g.time}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center hidden lg:table-cell">
                    <span className="flex items-center justify-center gap-1 text-slate-500">
                      <Users size={12} /> {g.students_count ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
