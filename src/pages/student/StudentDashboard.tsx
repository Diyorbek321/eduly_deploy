import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar, BookOpen, CreditCard, Trophy, Clock, MapPin,
  TrendingUp, Award, ChevronRight, CheckCircle2, XCircle, Zap, Wallet,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface NextLesson {
  id: number;
  group_name: string;
  course: string;
  teacher: string;
  room: string;
  time: string;
  date: string;
  day: string;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  date: string;
  status: string;
  course?: string;
}

interface Attendance {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  group_name: string;
}

interface Achievement {
  id: number;
  name: string;
  icon: string;
  earned: boolean;
}

interface Group {
  id: number;
  name: string;
  course_name: string;
  teacher_name: string;
  room: string;
  schedule: string;
  time: string;
  students_count: number;
  capacity: number;
}

interface StudentStats {
  student_id: number;
  name: string;
  phone: string;
  avatar: string | null;
  total_paid: number;
  total_debt: number;
  attendance_rate: number;
  points: number;
  rank: number;
  groups: Group[];
  next_lessons: NextLesson[];
  recent_payments: Payment[];
  recent_attendance: Attendance[];
  achievements: Achievement[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/student/stats');
        setStats(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-slate-400">
        Yuklanmoqda...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-10 text-center text-slate-500">
        Ma'lumotlarni yuklab bo'lmadi.
      </div>
    );
  }

  const formatMoney = (n: number) => `${n.toLocaleString('uz-UZ')} so'm`;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Hayrli tong';
    if (h < 18) return 'Hayrli kun';
    return 'Hayrli kech';
  })();

  return (
    <motion.div
      className="flex-1 overflow-y-auto p-6 lg:p-8"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      {/* Hero */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl lg:p-8"
      >
        <motion.div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-orange-100">{greeting},</p>
            <h1 className="mt-1 text-3xl font-bold lg:text-4xl">{user?.name || stats.name} 👋</h1>
            <p className="mt-2 max-w-xl text-orange-50">
              Bugun {stats.next_lessons.length} ta darsingiz bor. Davomatingiz {stats.attendance_rate}% — zo'r ish!
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <motion.div
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur"
            >
              <Trophy size={28} className="text-yellow-200" />
              <div>
                <div className="text-xs text-orange-100">Mening ballarim</div>
                <div className="text-2xl font-bold">{stats.points}</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur"
            >
              <Award size={28} className="text-yellow-200" />
              <div>
                <div className="text-xs text-orange-100">Reyting</div>
                <div className="text-2xl font-bold">#{stats.rank}</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        variants={stagger}
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: 'Davomat', value: `${stats.attendance_rate}%`, icon: TrendingUp, color: '#16a34a', bg: '#dcfce7' },
          { label: "To'lagan", value: formatMoney(stats.total_paid), icon: Wallet, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Qarz', value: stats.total_debt > 0 ? formatMoney(stats.total_debt) : 'Yo\'q', icon: CreditCard, color: stats.total_debt > 0 ? '#dc2626' : '#16a34a', bg: stats.total_debt > 0 ? '#fee2e2' : '#dcfce7' },
          { label: 'Guruhlar', value: stats.groups.length.toString(), icon: BookOpen, color: '#ec5b13', bg: '#ffedd5' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">{kpi.label}</div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.bg }}>
                  <Icon size={18} style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{kpi.value}</div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming lessons */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-[#ec5b13]" />
              <h2 className="text-lg font-bold text-slate-900">Yaqin darslar</h2>
            </div>
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-1 text-sm font-medium text-[#ec5b13] hover:underline"
            >
              Barchasi <ChevronRight size={16} />
            </button>
          </div>
          <motion.div variants={stagger} className="space-y-3">
            {stats.next_lessons.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Yaqin orada darslar yo'q
              </div>
            )}
            {stats.next_lessons.map((lesson) => (
              <motion.div
                key={lesson.id}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-[#ec5b13]">
                  <span className="text-[10px] font-semibold uppercase">{lesson.day}</span>
                  <span className="text-lg font-bold leading-none">{lesson.date.split('-')[2]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{lesson.group_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {lesson.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {lesson.room}-xona</span>
                    <span>O'qituvchi: {lesson.teacher}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Yutuqlar</h2>
          </div>
          <div className="space-y-3">
            {stats.achievements.map((a) => (
              <motion.div
                key={a.id}
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  a.earned
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-slate-100 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="text-2xl">{a.icon}</div>
                <div className="flex-1 text-sm font-medium text-slate-800">{a.name}</div>
                {a.earned && <CheckCircle2 size={18} className="text-amber-500" />}
              </motion.div>
            ))}
          </div>
          <button
            onClick={() => navigate('/gamification')}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Mukofotlar do'koni <ChevronRight size={16} />
          </button>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* My groups */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Mening guruhlarim</h2>
            </div>
            <button
              onClick={() => navigate('/groups')}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              Barchasi <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {stats.groups.map((g) => (
              <motion.div
                key={g.id}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{g.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{g.course_name} • {g.teacher_name}</div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {g.students_count}/{g.capacity}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {g.schedule}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {g.time}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {g.room}-xona</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent attendance */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">So'nggi davomat</h2>
          </div>
          <div className="space-y-2">
            {stats.recent_attendance.map((a, i) => (
              <motion.div
                key={`${a.date}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-lg bg-slate-50/50 px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-medium text-slate-900">{a.group_name}</div>
                  <div className="text-xs text-slate-500">{new Date(a.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}</div>
                </div>
                {a.status === 'present' ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle2 size={12} /> Keldi
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    <XCircle size={12} /> Kelmadi
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent payments */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900">So'nggi to'lovlar</h2>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:underline"
          >
            Barchasi <ChevronRight size={16} />
          </button>
        </div>
        {stats.recent_payments.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            To'lovlar tarixi yo'q
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent_payments.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between rounded-lg bg-slate-50/50 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{formatMoney(p.amount)}</div>
                  <div className="text-xs text-slate-500">{p.course} • {p.method}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</div>
                  <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    {p.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
