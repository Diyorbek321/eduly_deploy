import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Download,
  AlertCircle,
  BookOpen,
  GraduationCap,
  BarChart2,
  Activity,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import api from '@/src/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_students: number;
  active_students: number;
  total_teachers: number;
  total_groups: number;
  total_revenue: number;
  total_debt: number;
}

interface ChartData {
  labels: string[];
  data: number[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ['#F26522', '#7C5CFC', '#10B981', '#FBBF24', '#3B82F6', '#EF4444', '#EC4899', '#06B6D4'];

const MONTH_MAP = {
  Jan: 'Yanvar', Feb: 'Fevral', Mar: 'Mart', Apr: 'Aprel',
  May: 'May', Jun: 'Iyun', Jul: 'Iyul', Aug: 'Avgust',
  Sep: 'Sentyabr', Oct: 'Oktyabr', Nov: 'Noyabr', Dec: 'Dekabr',
};

// ─── Animated Number Counter ─────────────────────────────────────────────────

const AnimatedNumber = ({ value, duration = 1200, formatFn }: { value: any; duration?: number; formatFn?: any }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const startTime = useRef(null);
  const numValue = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, '')) || 0;

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return; }
    const animate = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const progress = Math.min((ts - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numValue));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); startTime.current = null; };
  }, [numValue, duration]);

  return <>{formatFn ? formatFn(display) : display.toLocaleString()}</>;
};

// ─── Sparkline Mini Chart ────────────────────────────────────────────────────

const MiniSparkline = ({ data, color, height = 32, width = 80 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon
        fill={`url(#spark-${color.replace('#', '')})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
      <circle cx={width} cy={parseFloat(points.split(' ').pop().split(',')[1])} r="2.5" fill={color} />
    </svg>
  );
};

// ─── Stagger Animation Wrapper ───────────────────────────────────────────────

const StaggerItem = ({ children, index, className = '' }) => (
  <div
    className={`animate-fadeSlideUp ${className}`}
    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
  >
    {children}
  </div>
);

// ─── Custom Tooltips ─────────────────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-[#0c0c0f] border border-white/10 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl">
      <p className="text-[11px] text-gray-500 font-semibold tracking-wide uppercase mb-1">{label}</p>
      <p className="text-lg font-black text-white tabular-nums">
        {Number(val).toLocaleString()}
        <span className="text-[11px] text-gray-500 font-medium ml-1.5">UZS</span>
      </p>
    </div>
  );
};

const AttendanceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = val >= 80 ? '#10B981' : val >= 60 ? '#FBBF24' : '#EF4444';
  return (
    <div className="bg-[#0c0c0f] border border-white/10 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl">
      <p className="text-[11px] text-gray-500 font-semibold tracking-wide uppercase mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-lg font-black text-white tabular-nums">{val}%</p>
      </div>
      <p className="text-[10px] mt-1" style={{ color }}>
        {val >= 80 ? "A'lo" : val >= 60 ? "O'rta" : 'Past'}
      </p>
    </div>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, subtitle, badge, action }: { icon: any; title: any; subtitle: any; badge?: any; action?: any }) => (
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F26522]/10 to-[#F26522]/5 border border-[#F26522]/10 flex items-center justify-center mt-0.5">
        <Icon size={16} className="text-[#F26522]" />
      </div>
      <div>
        <h3 className="text-[15px] font-extrabold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
    {badge && (
      <span className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl ${badge.className}`}>
        {badge.icon && <badge.icon size={11} />}
        {badge.text}
      </span>
    )}
    {action && action}
  </div>
);

// ─── Circular Progress Ring ──────────────────────────────────────────────────

const ProgressRing = ({ percent, size = 56, strokeWidth = 5, color, children }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Reports = () => {
  const [stats, setStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState(null);
  const [attendanceChart, setAttendanceChart] = useState(null);
  const [courseDistribution, setCourseDistribution] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredKpi, setHoveredKpi] = useState(null);
  const [selectedChart, setSelectedChart] = useState('area');

  // ── Fetch Data (100% original API calls preserved) ──

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, revenueRes, attendanceRes, groupsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/revenue-chart', { params: { period: 'monthly' } }),
          api.get('/dashboard/attendance-chart', { params: { period: 'weekly' } }),
          api.get('/groups'),
        ]);
        setStats(statsRes.data);
        setRevenueChart(revenueRes.data);
        setAttendanceChart(attendanceRes.data);

        const courseMap = new Map();
        (groupsRes.data || []).forEach((g) => {
          const courseName = g.course_name || 'Boshqa';
          const count = g.students_count ?? 0;
          courseMap.set(courseName, (courseMap.get(courseName) || 0) + count);
        });
        setCourseDistribution(
          Array.from(courseMap.entries()).map(([name, value]) => ({ name, value }))
        );
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Derived Data ──

  const revenueData = revenueChart
    ? revenueChart.labels.map((label, i) => ({ name: label, revenue: revenueChart.data[i] }))
    : [];

  const attendanceData = attendanceChart
    ? attendanceChart.labels.map((label, i) => ({ name: label, count: attendanceChart.data[i] }))
    : [];

  const totalCourseStudents = courseDistribution.reduce((sum, c) => sum + c.value, 0);
  const activeRate = stats ? Math.round((stats.active_students / (stats.total_students || 1)) * 100) : 0;
  const debtRate = stats ? Math.round((stats.total_debt / (stats.total_revenue || 1)) * 100) : 0;
  const avgAttendance = attendanceData.length > 0
    ? Math.round(attendanceData.reduce((s, d) => s + d.count, 0) / attendanceData.length)
    : 0;

  // ── KPI Config ──

  const kpis = [
    {
      label: 'Umumiy tushum',
      rawValue: stats?.total_revenue ?? 0,
      unit: 'UZS',
      icon: Wallet,
      accent: '#F26522',
      gradient: 'from-orange-500/8 to-amber-500/4',
      borderGradient: 'from-orange-500/20 via-orange-500/5 to-transparent',
      sparkData: revenueChart?.data,
      sub: "Jami yig'ilgan",
      trend: '+12%',
      trendUp: true,
    },
    {
      label: "Faol o'quvchilar",
      rawValue: stats?.active_students ?? 0,
      unit: `/ ${stats?.total_students ?? 0}`,
      icon: Users,
      accent: '#7C5CFC',
      gradient: 'from-violet-500/8 to-indigo-500/4',
      borderGradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
      sparkData: attendanceChart?.data,
      sub: `${activeRate}% faollik`,
      trend: `${activeRate}%`,
      trendUp: activeRate > 50,
      isPercent: true,
    },
    {
      label: 'Guruhlar soni',
      rawValue: stats?.total_groups ?? 0,
      unit: 'ta',
      icon: BookOpen,
      accent: '#10B981',
      gradient: 'from-emerald-500/8 to-teal-500/4',
      borderGradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      sparkData: null,
      sub: `${stats?.total_teachers ?? 0} ta o'qituvchi`,
      trend: null,
    },
    {
      label: 'Qarzdorlik',
      rawValue: stats?.total_debt ?? 0,
      unit: 'UZS',
      icon: AlertCircle,
      accent: '#EF4444',
      gradient: 'from-red-500/8 to-rose-500/4',
      borderGradient: 'from-red-500/20 via-red-500/5 to-transparent',
      sparkData: null,
      sub: `Tushum ${debtRate}%`,
      trend: `${debtRate}%`,
      trendUp: false,
    },
  ];

  // ── Render ──

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
      <Header />

      {/* Accent Line */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#F26522] via-[#7C5CFC] to-[#10B981]" />

      {/* Inline Styles for Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlideUp { animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1); }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .card-hover {
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08), 0 4px 12px -2px rgba(0,0,0,0.04);
        }

        .chart-card {
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .chart-card:hover {
          box-shadow: 0 20px 48px -12px rgba(0,0,0,0.06);
        }

        .dot-pattern {
          background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">

        {/* ─── Page Header ─── */}
        <StaggerItem index={0}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-[#F26522] flex items-center justify-center">
                  <BarChart2 size={13} className="text-white" />
                </div>
                <span className="text-[11px] font-black text-[#F26522] uppercase tracking-[0.15em]">Tahlil va Hisobotlar</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
                Hisobotlar
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 font-medium">
                Markaz faoliyatining to'liq statistik tahlili
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm active:scale-[0.97]">
                <Filter size={14} />
                Filtr
              </button>
              <button className="flex items-center gap-2 bg-gradient-to-r from-[#0c0c0f] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#0c0c0f] text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm active:scale-[0.97] shadow-xl shadow-black/10">
                <Download size={14} />
                PDF Yuklash
              </button>
            </div>
          </div>
        </StaggerItem>

        {/* ─── Loading State ─── */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl shimmer-bg" />
                  <div className="h-3 w-20 rounded shimmer-bg" />
                  <div className="h-7 w-32 rounded shimmer-bg" />
                  <div className="h-2.5 w-24 rounded shimmer-bg" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[0, 1].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-[360px]">
                  <div className="h-4 w-40 rounded shimmer-bg mb-2" />
                  <div className="h-3 w-28 rounded shimmer-bg mb-6" />
                  <div className="h-[260px] w-full rounded-xl shimmer-bg" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {kpis.map((kpi, i) => (
                <StaggerItem key={i} index={i + 1}>
                  <div
                    className={`relative bg-white rounded-2xl border border-slate-100/80 card-hover p-5 overflow-hidden cursor-default group`}
                    onMouseEnter={() => setHoveredKpi(i)}
                    onMouseLeave={() => setHoveredKpi(null)}
                  >
                    {/* Gradient top border */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.borderGradient}`} />

                    {/* Background gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                          style={{ background: `${kpi.accent}12` }}
                        >
                          <kpi.icon size={18} style={{ color: kpi.accent }} />
                        </div>
                        {kpi.sparkData && (
                          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                            <MiniSparkline data={kpi.sparkData} color={kpi.accent} width={64} height={28} />
                          </div>
                        )}
                        {!kpi.sparkData && kpi.trend && (
                          <div
                            className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-lg ${kpi.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                              }`}
                          >
                            {kpi.trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {kpi.trend}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5">
                        {kpi.label}
                      </p>
                      <p className="text-[26px] font-black text-slate-900 leading-none tabular-nums tracking-tight">
                        <AnimatedNumber value={kpi.rawValue} />
                        <span className="text-sm font-semibold text-slate-400 ml-1.5">{kpi.unit}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-2.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full" style={{ background: kpi.accent }} />
                        {kpi.sub}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </div>

            {/* ─── Quick Stats Strip ─── */}
            <StaggerItem index={5}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5">
                  <ProgressRing percent={activeRate} size={32} strokeWidth={3} color="#7C5CFC">
                    <span className="text-[8px] font-black text-slate-700">{activeRate}%</span>
                  </ProgressRing>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Faollik</p>
                    <p className="text-xs font-bold text-slate-800">
                      {stats?.active_students ?? 0} / {stats?.total_students ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5">
                  <ProgressRing percent={avgAttendance} size={32} strokeWidth={3} color="#10B981">
                    <span className="text-[8px] font-black text-slate-700">{avgAttendance}%</span>
                  </ProgressRing>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">O'rtacha davomat</p>
                    <p className="text-xs font-bold text-slate-800">Haftalik</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5">
                  <ProgressRing percent={Math.min(100 - debtRate, 100)} size={32} strokeWidth={3} color="#F26522">
                    <span className="text-[8px] font-black text-slate-700">{100 - debtRate}%</span>
                  </ProgressRing>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">To'lov darajasi</p>
                    <p className="text-xs font-bold text-slate-800">Umumiy</p>
                  </div>
                </div>
              </div>
            </StaggerItem>

            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Revenue Area Chart */}
              <StaggerItem index={6}>
                <div className="bg-white rounded-2xl border border-slate-100/80 chart-card p-6 relative overflow-hidden">
                  {/* Decorative dots */}
                  <div className="absolute top-0 right-0 w-32 h-32 dot-pattern opacity-30 pointer-events-none" />

                  <SectionHeader
                    icon={TrendingUp}
                    title="Moliya dinamikasi"
                    subtitle="Oylik tushum tendensiyasi"
                    badge={
                      revenueData.length > 1 && revenueData[revenueData.length - 1]?.revenue > revenueData[revenueData.length - 2]?.revenue
                        ? { text: "O'sishda", icon: ArrowUpRight, className: 'text-emerald-600 bg-emerald-50 border border-emerald-100' }
                        : { text: "Barqaror", icon: Activity, className: 'text-slate-500 bg-slate-50 border border-slate-100' }
                    }
                  />

                  <div className="h-[280px] w-full">
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revGradAdv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F26522" stopOpacity={0.2} />
                              <stop offset="60%" stopColor="#F26522" stopOpacity={0.05} />
                              <stop offset="100%" stopColor="#F26522" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name" axisLine={false} tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={8}
                          />
                          <YAxis
                            axisLine={false} tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={38}
                          />
                          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#F26522', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <Area
                            type="monotone" dataKey="revenue" stroke="#F26522" strokeWidth={2.5}
                            fillOpacity={1} fill="url(#revGradAdv)" dot={false}
                            activeDot={{ r: 6, fill: '#F26522', stroke: '#fff', strokeWidth: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState />
                    )}
                  </div>

                  {/* Summary footer */}
                  {revenueData.length > 0 && (
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Eng yuqori</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">
                          {Math.max(...revenueData.map(d => d.revenue)).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">UZS</span>
                        </p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">O'rtacha</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">
                          {Math.round(revenueData.reduce((s, d) => s + d.revenue, 0) / revenueData.length).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">UZS</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </StaggerItem>

              {/* Attendance Bar Chart */}
              <StaggerItem index={7}>
                <div className="bg-white rounded-2xl border border-slate-100/80 chart-card p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 dot-pattern opacity-30 pointer-events-none" />

                  <SectionHeader
                    icon={Activity}
                    title="Davomat foizi"
                    subtitle="Oxirgi 7 kunlik davomat"
                    badge={{ text: 'Haftalik', icon: Calendar, className: 'text-slate-500 bg-slate-50 border border-slate-100' }}
                  />

                  <div className="h-[280px] w-full">
                    {attendanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attendanceData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }} barSize={32}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name" axisLine={false} tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={8}
                          />
                          <YAxis
                            axisLine={false} tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={36}
                          />
                          <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'rgba(241,245,249,0.5)', radius: 8 }} />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {attendanceData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={entry.count >= 80 ? '#10B981' : entry.count >= 60 ? '#FBBF24' : '#EF4444'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-50">
                    {[
                      { color: '#10B981', label: "A'lo (≥80%)", bg: '#ECFDF5' },
                      { color: '#FBBF24', label: "O'rta (60-79%)", bg: '#FFFBEB' },
                      { color: '#EF4444', label: 'Past (<60%)', bg: '#FEF2F2' },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md flex-shrink-0" style={{ background: l.bg, border: `2px solid ${l.color}` }} />
                        <span className="text-[11px] text-slate-500 font-semibold">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* Course Distribution Donut */}
              <StaggerItem index={8}>
                <div className="bg-white rounded-2xl border border-slate-100/80 chart-card p-6">
                  <SectionHeader
                    icon={GraduationCap}
                    title="Kurslar bo'yicha taqsimot"
                    subtitle="O'quvchilar soni kurslarda"
                  />

                  {courseDistribution.length > 0 ? (
                    <div className="flex items-center gap-8">
                      <div className="flex-shrink-0 relative" style={{ width: 200, height: 200 }}>
                        <PieChart width={200} height={200}>
                          <Pie
                            data={courseDistribution}
                            cx={95} cy={95}
                            innerRadius={58} outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                            animationBegin={0}
                            animationDuration={800}
                          >
                            {courseDistribution.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [`${v} ta`, '']}
                            contentStyle={{
                              background: '#0c0c0f',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          />
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-2xl font-black text-slate-900 tabular-nums">
                            <AnimatedNumber value={totalCourseStudents} />
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">jami</p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 min-w-0">
                        {courseDistribution.map((item, i) => {
                          const pct = totalCourseStudents > 0 ? Math.round((item.value / totalCourseStudents) * 100) : 0;
                          return (
                            <div key={item.name} className="group/item">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-md flex-shrink-0 transition-transform group-hover/item:scale-125"
                                    style={{ background: COLORS[i % COLORS.length] }}
                                  />
                                  <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                  <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
                                  <span className="text-xs font-black text-slate-900">{item.value}</span>
                                </div>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </StaggerItem>

              {/* Summary Panel — Dark Card */}
              <StaggerItem index={9}>
                <div className="bg-gradient-to-br from-[#0c0c0f] via-[#111118] to-[#0c0c0f] rounded-2xl p-6 relative overflow-hidden">
                  {/* Ambient glows */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#F26522] rounded-full blur-[80px] opacity-[0.08] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#7C5CFC] rounded-full blur-[60px] opacity-[0.08] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#10B981] rounded-full blur-[60px] opacity-[0.04] pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Sparkles size={16} className="text-[#F26522]" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-extrabold text-white tracking-tight">Umumiy ko'rsatkichlar</h3>
                        <p className="text-[11px] text-gray-500 font-medium">Barcha statistikalar</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        {
                          icon: GraduationCap,
                          color: '#F26522',
                          label: "O'qituvchilar",
                          value: `${stats?.total_teachers ?? 0} ta faol`,
                        },
                        {
                          icon: Users,
                          color: '#7C5CFC',
                          label: "O'quvchilar",
                          value: `${stats?.active_students ?? 0} / ${stats?.total_students ?? 0} faol`,
                        },
                        {
                          icon: Wallet,
                          color: '#10B981',
                          label: 'Tushum',
                          value: `${(stats?.total_revenue ?? 0).toLocaleString()} UZS`,
                        },
                        {
                          icon: AlertCircle,
                          color: '#EF4444',
                          label: 'Qarzdorlik',
                          value: `${(stats?.total_debt ?? 0).toLocaleString()} UZS`,
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 group/row cursor-default"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover/row:scale-110"
                            style={{ background: `${item.color}18` }}
                          >
                            <item.icon size={17} style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.label}</p>
                            <p className="text-sm font-bold text-white truncate mt-0.5">{item.value}</p>
                          </div>
                          <ChevronRight size={14} className="text-gray-600 group-hover/row:text-gray-400 transition-colors" />
                        </div>
                      ))}
                    </div>

                    {/* Progress bars */}
                    <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] text-gray-500 font-bold">Faollik darajasi</p>
                          <p className="text-[13px] text-white font-black tabular-nums">{activeRate}%</p>
                        </div>
                        <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${activeRate}%`,
                              background: 'linear-gradient(90deg, #F26522, #FBBF24)',
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] text-gray-500 font-bold">Qarzdorlik nisbati</p>
                          <p className="text-[13px] text-white font-black tabular-nums">{debtRate}%</p>
                        </div>
                        <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.min(debtRate, 100)}%`,
                              background: 'linear-gradient(90deg, #EF4444, #F97316)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
      <FileText size={20} className="text-slate-300" />
    </div>
    <p className="text-sm font-bold text-slate-400">Ma'lumotlar topilmadi</p>
    <p className="text-xs text-slate-300 mt-1">Hozircha yetarli ma'lumot mavjud emas</p>
  </div>
);