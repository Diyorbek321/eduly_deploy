import React, { useEffect, useState } from 'react';
import {
  Users, Wallet, AlertTriangle, TrendingUp,
  Building2, Loader2, ChevronRight, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface BranchStats {
  branch: { id: number; name: string; address: string | null };
  total_students: number;
  active_students: number;
  total_teachers: number;
  total_groups: number;
  total_revenue: number;
  total_debt: number;
}

interface ChartPoint { name: string; value: number }

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

function StatCard({
  label, value, unit, sub, icon: Icon, accent,
}: {
  label: string; value: string; unit: string; sub: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ background: `${accent}18` }}>
          <Icon size={20} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">
        {value}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </p>
      <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.center_id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, chartRes] = await Promise.all([
          api.get(`/branches/${user.center_id}/stats`),
          api.get('/dashboard/revenue-chart', { params: { period: 'monthly' } }),
        ]);
        setStats(statsRes.data);
        const labels: string[] = chartRes.data?.labels ?? [];
        const data: number[] = chartRes.data?.data ?? [];
        setChartData(labels.map((l, i) => ({ name: l, value: data[i] ?? 0 })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.center_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span>Yuklanmoqda...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 gap-3">
        <Building2 size={40} />
        <p className="font-bold">Filial ma'lumotlari topilmadi</p>
        <p className="text-sm">Sizning hisobingizga filial biriktirilmagan</p>
      </div>
    );
  }

  const kpis = [
    { label: "O'quvchilar", value: stats.active_students.toString(), unit: `/ ${stats.total_students}`, sub: 'Faol / Jami', icon: Users, accent: '#6366f1' },
    { label: 'Tushum', value: fmt(stats.total_revenue), unit: 'UZS', sub: `${stats.total_groups} ta guruh`, icon: Wallet, accent: '#ec5b13' },
    { label: 'Qarzdorlik', value: fmt(stats.total_debt), unit: 'UZS', sub: 'Jami qarz', icon: AlertTriangle, accent: '#ef4444' },
    { label: "O'qituvchilar", value: stats.total_teachers.toString(), unit: 'ta', sub: 'Faol', icon: TrendingUp, accent: '#10b981' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* Branch header */}
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-orange-50 flex items-center justify-center">
          <Building2 size={22} className="text-[#ec5b13]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">{stats.branch.name}</h1>
          {stats.branch.address && (
            <p className="text-sm text-slate-400">{stats.branch.address}</p>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-black text-slate-900">Tushum dinamikasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Oylik ko'rsatkich</p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Activity size={13} />
            Live
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec5b13" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ec5b13" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }}
              formatter={(v) => [(Number(v) || 0).toLocaleString() + ' UZS', 'Tushum']}
            />
            <Area type="monotone" dataKey="value" stroke="#ec5b13" strokeWidth={2.5} fill="url(#grad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Moliya holati', sub: 'To\'lov darajasi va hisob-fakturalar', href: '/finance', accent: '#ec5b13' },
          { label: 'CRM Pipeline', sub: 'Yangi leadlar va konversiya', href: '/crm', accent: '#6366f1' },
          { label: "O'qituvchi KPI", sub: 'Reyting va bonuslar', href: '/staff', accent: '#10b981' },
        ].map(card => (
          <a
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div>
              <p className="font-bold text-slate-900">{card.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-[#ec5b13] transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
};
