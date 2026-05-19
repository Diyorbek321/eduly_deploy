import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Loader2, Phone, Tag, ChevronRight,
  Plus, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../lib/api';

interface PipelineStats {
  total: number;
  by_stage: Record<string, number>;
  conversion_rate: number;
}

interface Lead {
  id: number;
  name: string;
  phone: string;
  stage: string;
  course_interest: string | null;
  trial_date: string | null;
  source: string | null;
  created_at: string;
}

const STAGES = [
  { key: "Yangi",             color: '#6366f1' },
  { key: "Qo'ng'iroq",       color: '#f59e0b' },
  { key: "Sinov darsi",       color: '#3b82f6' },
  { key: "Ro'yxatdan o'tdi", color: '#10b981' },
  { key: "Yo'qotildi",       color: '#ef4444' },
];

export const CRM = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, leadsRes] = await Promise.all([
          api.get('/crm/stats'),
          api.get('/crm/leads'),
        ]);
        setStats(statsRes.data?.data ?? statsRes.data);
        const all: Lead[] = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.data ?? []);
        setRecentLeads(all.slice(0, 10));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
      </div>
    );
  }

  const chartData = STAGES.map(s => ({
    name: s.key,
    count: stats?.by_stage[s.key] ?? 0,
    color: s.color,
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">

      <div>
        <h1 className="text-xl font-black text-slate-900">CRM Pipeline</h1>
        <p className="text-sm text-slate-400 mt-0.5">Leadlar va savdo quvuri</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jami leadlar</p>
          <p className="text-3xl font-black text-slate-900">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ro'yxatga o'tdi</p>
          <p className="text-3xl font-black text-emerald-600">
            {stats?.by_stage["Ro'yxatdan o'tdi"] ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Konversiya</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900">{stats?.conversion_rate ?? 0}%</p>
            <TrendingUp size={18} className="text-emerald-500 mb-1" />
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-base font-black text-slate-900 mb-5">Bosqichlar bo'yicha</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={36} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-3">
        {STAGES.map(s => (
          <div key={s.key} className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2">
            <div className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs font-bold text-slate-700">{s.key}</span>
            <span
              className="size-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: s.color }}
            >
              {stats?.by_stage[s.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      {recentLeads.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900">So'nggi leadlar</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLeads.map(lead => {
              const stg = STAGES.find(s => s.key === lead.stage);
              return (
                <div key={lead.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center font-black text-sm text-slate-500 flex-shrink-0">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone size={10} /> {lead.phone}
                      {lead.course_interest && <><span>·</span><Tag size={10} />{lead.course_interest}</>}
                    </p>
                  </div>
                  {lead.trial_date && (
                    <span className="hidden sm:flex items-center gap-1 text-[11px] text-sky-600 font-medium">
                      <Calendar size={11} /> {new Date(lead.trial_date).toLocaleDateString('uz-UZ')}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: `${stg?.color ?? '#6366f1'}18`, color: stg?.color ?? '#6366f1' }}
                  >
                    {lead.stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
