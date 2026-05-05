import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';
import { Users, BookOpen, Calendar, Clock, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal } from '@/src/components/Modal';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';

interface GroupInfo {
  id: number;
  name: string;
  schedule: string | null;
  time: string | null;
  room: string | null;
  capacity: number;
  students_count: number;
  course_name: string;
}

interface DashboardStats {
  teacher_id: number;
  teacher_name: string;
  specialty: string | null;
  hourly_rate: number;
  groups_count: number;
  total_students: number;
  groups: GroupInfo[];
}

interface StudentInfo {
  id: number;
  name: string;
  phone: string;
  avatar: string | null;
  status: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
  late: 'Kechikdi',
  excused: 'Sababli',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

// Parse schedule string like "Du/Cho/Sha" into day indices [0,2,4]
const DAY_MAP: Record<string, number> = {
  'Du': 0, 'Dush': 0, 'Se': 1, 'Sesh': 1, 'Ch': 2, 'Cho': 2, 'Chor': 2,
  'Pa': 3, 'Pay': 3, 'Ju': 4, 'Jum': 4, 'Sh': 5, 'Sha': 5, 'Ya': 6, 'Yak': 6,
};

function parseScheduleDays(schedule: string | null): number[] {
  if (!schedule) return [];
  const parts = schedule.replace(/[()]/g, '').split(/[\/\-,\s]+/);
  return parts.map(p => DAY_MAP[p.trim()]).filter(d => d !== undefined);
}

function getTodayGroupClasses(groups: GroupInfo[]): GroupInfo[] {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return groups.filter(g => parseScheduleDays(g.schedule).includes(todayIdx));
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Attendance modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [groupStudents, setGroupStudents] = useState<StudentInfo[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get('/teacher/stats');
      setStats(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setLoadError(typeof detail === 'string' ? detail : "Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleStartClass = async (group: GroupInfo) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
    setStudentsError(null);
    setSaveError(null);
    try {
      const { data } = await api.get(`/teacher/my-groups/${group.id}/students`);
      setGroupStudents(data);
      const init: Record<number, AttendanceStatus> = {};
      data.forEach((s: StudentInfo) => { init[s.id] = 'present'; });
      setAttendance(init);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setGroupStudents([]);
      setStudentsError(typeof detail === 'string' ? detail : "O'quvchilarni yuklab bo'lmadi");
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedGroup) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const records = Object.entries(attendance).map(([student_id, status]) => ({
        student_id: Number(student_id),
        status,
      }));
      await api.post('/teacher/attendance/bulk', {
        group_id: selectedGroup.id,
        date: new Date().toISOString().split('T')[0],
        records,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === 'string' ? detail : "Davomatni saqlashda xatolik");
    } finally {
      setIsSaving(false);
    }
  };

  // Weekly preview
  const getWeekData = () => {
    if (!stats) return [];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const groups = stats.groups.filter(g => parseScheduleDays(g.schedule).includes(dayIdx));
      return { day: d, groups };
    });
  };

  const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const weekData = getWeekData();
  const todayClasses = stats ? getTodayGroupClasses(stats.groups) : [];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="text-center py-20 text-slate-400">
          <p className="font-bold">{loadError || "O'qituvchi profili topilmadi"}</p>
          <p className="text-sm mt-1">Admin siz uchun o'qituvchi profili yaratishi kerak</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-bold"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Mening guruhlarim", value: stats.groups_count, icon: Users, color: "bg-blue-50 text-blue-600" },
    { title: "Jami o'quvchilarim", value: stats.total_students, icon: BookOpen, color: "bg-emerald-50 text-emerald-600" },
    { title: "Bugungi darslar", value: todayClasses.length, icon: Calendar, color: "bg-orange-50 text-[#ec5b13]" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Xush kelibsiz, {stats.teacher_name}!
          </h1>
          <p className="text-slate-500 mt-1">
            {stats.specialty || "O'qituvchi"} •{' '}
            Bugun: {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0", stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Classes */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Bugungi darslar</h2>
          {todayClasses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Calendar size={48} className="mx-auto mb-4 text-slate-200" />
              <p className="font-bold text-slate-500">Bugun dars yo'q</p>
            </div>
          ) : (
            todayClasses.map(group => {
              const timeStr = group.time || '—';
              return (
                <div key={group.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#ec5b13] flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black">{timeStr.split('-')[0]?.trim() || '—'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span>{group.course_name}</span>
                        <span>{timeStr}</span>
                        {group.room && <span>{group.room}</span>}
                        <span>{group.students_count} ta o'quvchi</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartClass(group)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-[#ec5b13] hover:bg-orange-600 text-white shadow-lg shadow-orange-200"
                  >
                    <Play size={18} />
                    Davomat olish
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Weekly Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Haftalik jadval</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="space-y-3">
              {weekData.map(({ day, groups }, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayLabel = DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1];
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-xs font-black",
                      isToday ? "bg-[#ec5b13] text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      <span>{dayLabel}</span>
                      <span className="text-[10px]">{day.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {groups.length === 0 ? (
                        <span className="text-slate-400 text-sm">Dars yo'q</span>
                      ) : (
                        <div className="space-y-1">
                          {groups.map(g => (
                            <div key={g.id} className="bg-orange-50 text-[#ec5b13] px-3 py-1.5 rounded-xl text-xs font-bold truncate">
                              {g.time?.split('-')[0]?.trim() || '—'} — {g.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${selectedGroup?.name || ''} — Davomat`}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              {isSaving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {(studentsError || saveError) && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl text-sm font-bold text-rose-700">
              {studentsError || saveError}
            </div>
          )}
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const all: Record<number, AttendanceStatus> = {};
                groupStudents.forEach(s => { all[s.id] = 'present'; });
                setAttendance(all);
              }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100"
            >
              Hammasi keldi
            </button>
            <button
              onClick={() => {
                const all: Record<number, AttendanceStatus> = {};
                groupStudents.forEach(s => { all[s.id] = 'absent'; });
                setAttendance(all);
              }}
              className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100"
            >
              Hammasi kelmadi
            </button>
          </div>

          {groupStudents.length === 0 ? (
            <p className="text-center text-slate-400 py-8">O'quvchilar topilmadi</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groupStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-[#ec5b13]">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                          attendance[student.id] === status
                            ? STATUS_COLORS[status] + ' border-current'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      </main>
    </div>
  );
}
