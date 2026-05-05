import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TrendingUp, Users, BookOpen, CheckCircle2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface GroupCard {
  id: number;
  name: string;
  students_count: number;
  capacity: number;
  course_name: string;
}

interface Stats {
  teacher_name: string;
  specialty: string | null;
  groups_count: number;
  total_students: number;
  groups: GroupCard[];
}

interface AttendanceStat {
  total_records: number;
  present_count: number;
  average_percent: number;
}

interface GroupAttendance extends GroupCard {
  attendance_percent: number;
}

const COLORS = ['#ec5b13', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [overall, setOverall] = useState<AttendanceStat | null>(null);
  const [perGroup, setPerGroup] = useState<GroupAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.get<Stats>('/teacher/stats');
      setStats(s.data);

      const overallRes = await api.get<AttendanceStat>('/teacher/attendance-stats');
      setOverall(overallRes.data);

      const perGroupRes = await Promise.all(
        s.data.groups.map(async (g) => {
          const res = await api.get<AttendanceStat>('/teacher/attendance-stats', { params: { group_id: g.id } })
            .catch(() => ({ data: { total_records: 0, present_count: 0, average_percent: 0 } }));
          return { ...g, attendance_percent: res.data.average_percent };
        })
      );
      setPerGroup(perGroupRes);
    } catch (err: any) {
      setError(err.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
      </div>
    );
  }

  if (error || !stats || !overall) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="font-bold">{error || "Ma'lumot topilmadi"}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const bestGroup = perGroup.length > 0
    ? perGroup.reduce((a, b) => (a.attendance_percent > b.attendance_percent ? a : b))
    : null;

  const chartData = perGroup.map((g) => ({
    name: g.name.length > 15 ? g.name.slice(0, 15) + '…' : g.name,
    davomat: g.attendance_percent,
    oquvchilar: g.students_count,
  }));

  const statCards = [
    { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', label: "O'rtacha davomat", value: `${overall.average_percent}%` },
    { icon: Users, color: 'bg-blue-50 text-blue-600', label: "O'quvchilar", value: stats.total_students },
    { icon: BookOpen, color: 'bg-orange-50 text-[#ec5b13]', label: 'Guruhlar', value: stats.groups_count },
    { icon: TrendingUp, color: 'bg-purple-50 text-purple-600', label: 'Eng yaxshi guruh', value: bestGroup ? bestGroup.name : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Analitika</h1>
          <p className="text-slate-500 mt-1">Guruhlar va davomat ko'rsatkichlari</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} />Yangilash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className={`size-12 rounded-2xl ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={22} />
            </div>
            <p className="text-sm text-slate-500 font-medium">{c.label}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{c.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-black text-slate-900 mb-4">Guruhlar davomati</h3>
        {chartData.length === 0 ? (
          <p className="text-center py-8 text-slate-400">Ma'lumot yo'q</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="davomat" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Guruhlar bo'yicha tafsilotlar</h3>
        </div>
        {perGroup.length === 0 ? (
          <p className="text-center py-8 text-slate-400">Guruhlar yo'q</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {perGroup.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-bold text-slate-900">{g.name}</p>
                  <p className="text-sm text-slate-500">{g.course_name} • {g.students_count}/{g.capacity} o'quvchi</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${g.attendance_percent >= 80 ? 'text-emerald-600' : g.attendance_percent >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {g.attendance_percent}%
                  </p>
                  <p className="text-xs text-slate-400">Davomat</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
