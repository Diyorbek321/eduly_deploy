import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  Send,
  MoreVertical,
  Activity,
  ChevronUp,
  ChevronDown,
  Bell,
  Search,
  Clock,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '@/src/lib/hashId';
import api from '@/src/lib/api';

interface DashboardStats {
  total_students: number;
  active_students: number;
  total_teachers: number;
  total_groups: number;
  total_revenue: number;
  total_debt: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

interface TransactionItem {
  id: number;
  name: string;
  amount: string;
  type: string;
  date: string;
  status: string;
}

interface DebtorItem {
  id: number;
  name: string;
  amount: string;
}

const avatarColors = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-950 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">
          {Number(payload[0].value).toLocaleString()} <span className="text-gray-400 font-normal text-xs">UZS</span>
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [debtors, setDebtors] = useState<DebtorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChartFilter, setActiveChartFilter] = useState('30');

  useEffect(() => {
    if (!isAdmin) return;
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, chartRes, paymentsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/revenue-chart'),
          api.get('/payments?limit=5'),
        ]);

        setStats(statsRes.data);

        const labels: string[] = chartRes.data.labels || [];
        const values: number[] = chartRes.data.data || [];
        setChartData(labels.map((label, i) => ({ name: label, value: values[i] || 0 })));

        const paymentItems = (paymentsRes.data.items || []).map((p: any) => ({
          id: p.id,
          name: p.student_name || '',
          amount: Number(p.amount).toLocaleString(),
          type: p.method,
          date: p.date ? new Date(p.date).toLocaleDateString('uz-UZ') : '',
          status: p.status,
        }));
        setTransactions(paymentItems);
      } catch {
        // errors handled by interceptor
      }

      try {
        const studentsRes = await api.get('/students?limit=100');
        const studentsList = studentsRes.data.items || studentsRes.data || [];
        const debtorsList = studentsList
          .filter((s: any) => s.debt > 0)
          .slice(0, 5)
          .map((s: any) => ({
            id: s.id,
            name: s.full_name || s.name || '',
            amount: Number(s.debt).toLocaleString(),
          }));
        setDebtors(debtorsList);
      } catch {
        // errors handled by interceptor
      }

      setIsLoading(false);
    };
    fetchDashboardData();
  }, [isAdmin]);

  const kpis = stats
    ? [
      {
        label: "Jami o'quvchilar",
        value: stats.total_students.toLocaleString(),
        unit: 'ta',
        sub: `${stats.active_students} faol`,
        icon: Users,
        accent: '#6366f1',
        accentLight: '#eef2ff',
        badge: '+12%',
        up: true,
      },
      {
        label: 'Jami tushum',
        value: stats.total_revenue.toLocaleString(),
        unit: 'UZS',
        sub: `${stats.total_groups} guruh`,
        icon: CreditCard,
        accent: '#ec5b13',
        accentLight: '#fff4ee',
        badge: '+8.4%',
        up: true,
      },
      {
        label: 'Qarzdorlik',
        value: stats.total_debt.toLocaleString(),
        unit: 'UZS',
        sub: 'Yuqori xavf',
        icon: AlertTriangle,
        accent: '#ef4444',
        accentLight: '#fef2f2',
        badge: '-3.1%',
        up: false,
      },
      {
        label: "O'qituvchilar",
        value: stats.total_teachers.toLocaleString(),
        unit: 'ta',
        sub: 'Faol',
        icon: TrendingUp,
        accent: '#10b981',
        accentLight: '#ecfdf5',
        badge: '+2',
        up: true,
      },
    ]
    : [];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50/60">
      <Header />

      {/* Top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#ec5b13] via-violet-500 to-sky-400" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-7 max-w-[1600px] mx-auto w-full">

        {/* Loading */}
        {isLoading && isAdmin && (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-orange-100 border-t-[#ec5b13] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity size={16} className="text-[#ec5b13]" />
              </div>
            </div>
          </div>
        )}

        {/* ── KPI CARDS ── */}
        {isAdmin && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden p-5"
              >
                {/* Left accent strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                  style={{ background: kpi.accent }}
                />

                <div className="flex items-start justify-between mb-5">
                  <div
                    className="p-2.5 rounded-xl flex items-center justify-center"
                    style={{ background: kpi.accentLight }}
                  >
                    <kpi.icon size={20} style={{ color: kpi.accent }} />
                  </div>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg',
                      kpi.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    )}
                  >
                    {kpi.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {kpi.badge}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  {kpi.label}
                </p>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {kpi.value}
                  <span className="text-sm font-normal text-slate-400 ml-1">{kpi.unit}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium">{kpi.sub}</p>

                {/* Decorative circle */}
                <div
                  className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
                  style={{ background: kpi.accent }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── MAIN GRID ── */}
        {isAdmin && !isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT COLUMN */}
            <div className="xl:col-span-2 space-y-6">

              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Tushum dinamikasi</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Moliyaviy o'sish ko'rsatkichi</p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {['7', '14', '30'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setActiveChartFilter(d)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          activeChartFilter === d
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                            : 'text-slate-400 hover:text-slate-600'
                        )}
                      >
                        {d}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini summary row */}
                <div className="flex items-center gap-6 mb-6">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Umumiy</p>
                    <p className="text-xl font-black text-slate-900">
                      {stats?.total_revenue.toLocaleString()}{' '}
                      <span className="text-sm font-normal text-slate-400">UZS</span>
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <TrendingUp size={14} />
                    +8.4% o'sish
                  </div>
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec5b13" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#ec5b13" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                        dy={8}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ec5b13', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#ec5b13"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#orangeGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#ec5b13', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Oxirgi tranzaksiyalar</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{transactions.length} ta yozuv</p>
                  </div>
                  <button className="flex items-center gap-1 text-[#ec5b13] text-xs font-bold hover:gap-2 transition-all">
                    Hammasini ko'rish <ArrowRight size={13} />
                  </button>
                </div>

                <div className="divide-y divide-slate-50">
                  {transactions.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
                          avatarColors[idx % avatarColors.length]
                        )}
                      >
                        {t.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>

                      {/* Name */}
                      <button
                        onClick={() => navigate(`/students/${encodeId(t.id)}`)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#ec5b13] transition-colors">
                          {t.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {t.date}
                        </p>
                      </button>

                      {/* Type badge */}
                      <span className="hidden sm:block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {t.type}
                      </span>

                      {/* Amount */}
                      <p className="text-sm font-black text-slate-900 tabular-nums">
                        {t.amount}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">UZS</span>
                      </p>

                      {/* Status */}
                      <span
                        className={cn(
                          'hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full',
                          t.status === 'Muvaffaqiyatli'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-orange-50 text-orange-600'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            t.status === 'Muvaffaqiyatli' ? 'bg-emerald-500' : 'bg-orange-500'
                          )}
                        />
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">

              {/* Debtors card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Red header */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 px-5 pt-5 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-white/80" />
                      <h2 className="text-sm font-black text-white">Qarzdorlar ro'yxati</h2>
                    </div>
                    <button className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      <MoreVertical size={14} className="text-white" />
                    </button>
                  </div>
                  <p className="text-red-100/70 text-[11px] font-medium">
                    {debtors.length} ta o'quvchi
                  </p>
                  <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                    <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Umumiy qarzdorlik</p>
                    <p className="text-white font-black text-sm ml-auto">
                      {stats?.total_debt.toLocaleString()} <span className="text-white/60 font-normal text-[10px]">UZS</span>
                    </p>
                  </div>
                </div>

                {/* Debtor list */}
                <div className="px-4 py-3 space-y-1">
                  {debtors.map((debtor, idx) => (
                    <div
                      key={debtor.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 font-black text-[10px] flex-shrink-0">
                        {debtor.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{debtor.name}</p>
                        <p className="text-[11px] text-red-500 font-black">{debtor.amount} UZS</p>
                      </div>
                      <button className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ec5b13] hover:border-[#ec5b13] hover:text-white text-slate-400">
                        <Send size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4">
                  <button className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold hover:border-red-300 hover:text-red-500 hover:bg-red-50/50 transition-all">
                    Hammani ko'rish →
                  </button>
                </div>
              </div>

              {/* Today's schedule */}
              <div className="bg-gray-950 rounded-2xl overflow-hidden p-5 relative">
                {/* Glow blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ec5b13] rounded-full blur-3xl opacity-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500 rounded-full blur-3xl opacity-10 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white">Bugungi darslar</h3>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#ec5b13] bg-[#ec5b13]/10 px-2 py-1 rounded-lg">
                      <Zap size={10} />
                      Jonli
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 bg-emerald-400 rounded-full flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">IELTS Intensive</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                            <Clock size={9} />
                            14:00 – 15:30 · Room 302
                          </p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                          FAOL
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 bg-[#ec5b13] rounded-full flex-shrink-0 animate-pulse" />
                        <div>
                          <p className="text-sm font-bold text-white">Mathematics SAT</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                            <Clock size={9} />
                            16:00 – 17:30 · Room 101
                          </p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md">
                          BREVE
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all">
                    Jadvalni ko'rish →
                  </button>
                </div>
              </div>

              {/* Quick stats mini bar chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900">Guruhlar faolligi</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{stats?.total_groups} ta guruh</span>
                </div>
                <div className="h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.slice(-7)}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      barSize={10}
                    >
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.slice(-7).map((_, index) => (
                          <Cell
                            key={index}
                            fill={index === chartData.slice(-7).length - 1 ? '#ec5b13' : '#e2e8f0'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ec5b13]" />
                  <p className="text-[11px] text-slate-400 font-medium">Bugun eng yuqori ko'rsatkich</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};