import React, { useEffect, useState } from 'react';
import {
  BarChart3, Loader2, Users, Wallet,
  AlertTriangle, GraduationCap, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../lib/api';

interface DashboardStats {
  total_students?: number;
  active_students?: number;
  total_revenue?: number;
  total_debt?: number;
  total_teachers?: number;
  total_groups?: number;
}

interface ChartPoint { name: string; value: number }

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

function KpiCard({
  label, value, unit, icon: Icon, accent,
}: {
  label: string; value: string | number; unit?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: `${accent}18` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-2xl font-black text-slate-900">
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export const Reports = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<ChartPoint[]>([]);
  const [attendanceData, setAttendanceData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sRes, rRes, aRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/revenue-chart', { params: { period: 'monthly' } }),
          api.get('/dashboard/attendance-chart', { params: { period: 'weekly' } }),
        ]);
        setStats(sRes.data ?? {});

        const rLabels: string[] = rRes.data?.labels ?? [];
        const rData: number[] = rRes.data?.data ?? [];
        setRevenueData(rLabels.map((l, i) => ({ name: l, value: rData[i] ?? 0 })));

        const aLabels: string[] = aRes.data?.labels ?? [];
        const aData: number[] = aRes.data?.data ?? [];
        setAttendanceData(aLabels.map((l, i) => ({ name: l, value: aData[i] ?? 0 })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
      </div>
    );
  }

  const kpis = [
    {
      label: "Faol o'quvchilar",
      value: stats?.active_students ?? 0,
      unit: `/ ${stats?.total_students ?? 0}`,
      icon: Users,
      accent: '#6366f1',
    },
    {
      label: "Tushum",
      value: fmt(stats?.total_revenue ?? 0),
      unit: 'UZS',
      icon: Wallet,
      accent: '#ec5b13',
    },
    {
      label: "Qarzdorlik",
      value: fmt(stats?.total_debt ?? 0),
      unit: 'UZS',
      icon: AlertTriangle,
      accent: '#ef4444',
    },
    {
      label: "O'qituvchilar",
      value: stats?.total_teachers ?? 0,
      unit: 'ta',
      icon: GraduationCap,
      accent: '#10b981',
    },
  ];

  const ATTENDANCE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec5b13', '#3b82f6', '#8b5cf6', '#ef4444'];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-violet-50 flex items-center justify-center">
          <BarChart3 size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Hisobotlar</h1>
          <p className="text-sm text-slate-400">Umumiy ko'rsatkichlar</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-slate-900">Tushum dinamikasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Oylik ko'rsatkich</p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Activity size={13} />
            Oylik
          </div>
        </div>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="value" stroke="#ec5b13" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-44 flex items-center justify-center text-slate-300 text-sm">Ma'lumot yo'q</div>
        )}
      </div>

      {/* Attendance chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-5">
          <h2 className="font-black text-slate-900">Davomat ko'rsatkichi</h2>
          <p className="text-xs text-slate-400 mt-0.5">Haftalik</p>
        </div>
        {attendanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceData} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Davomat">
                {attendanceData.map((_, i) => (
                  <Cell key={i} fill={ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-44 flex items-center justify-center text-slate-300 text-sm">Ma'lumot yo'q</div>
        )}
      </div>
    </div>
  );
};
