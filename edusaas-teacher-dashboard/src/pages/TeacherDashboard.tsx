import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Users, BookOpen, Calendar, Clock, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';

interface GroupCard {
  id: number;
  name: string;
  schedule: string | null;
  time: string | null;
  room: string | null;
  capacity: number;
  students_count: number;
  course_name: string;
  meets_today: boolean;
}

interface Stats {
  teacher_id: number;
  teacher_name: string;
  specialty: string | null;
  hourly_rate: number;
  groups_count: number;
  total_students: number;
  groups: GroupCard[];
  phone: string | null;
  email: string | null;
  avatar: string | null;
  experience: string | null;
  birth_date: string | null;
  bio: string | null;
  rating: number;
}

interface Student {
  id: number;
  name: string;
  phone: string | null;
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

export function TeacherDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupCard | null>(null);
  const [sessionStudents, setSessionStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Stats>('/teacher/stats');
      setStats(res.data);
    } catch (err: any) {
      setError(err.message || "Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleStartClass = async (group: GroupCard) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
    setSessionStudents([]);
    setAttendance({});
    try {
      const res = await api.get<Student[]>(`/teacher/my-groups/${group.id}/students`);
      setSessionStudents(res.data);
      const init: Record<number, AttendanceStatus> = {};
      res.data.forEach((s) => { init[s.id] = 'present'; });
      setAttendance(init);
    } catch (err: any) {
      alert(err.message || "O'quvchilarni yuklashda xatolik");
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedGroup) return;
    setIsSaving(true);
    try {
      const records = Object.entries(attendance).map(([student_id, status]) => ({
        student_id: Number(student_id),
        status,
      }));
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/teacher/attendance/bulk', {
        group_id: selectedGroup.id,
        date: today,
        records,
      });
      setIsModalOpen(false);
      alert('✅ Davomat muvaffaqiyatli saqlandi!');
    } catch (err: any) {
      alert(err.message || 'Davomatni saqlashda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="font-bold">{error || "O'qituvchi profili topilmadi"}</p>
        <p className="text-sm mt-1">Admin siz uchun o'qituvchi profili yaratishi kerak</p>
        <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const todayGroups = stats.groups.filter((g) => g.meets_today);

  const statCards = [
    { title: "Mening guruhlarim", value: stats.groups_count, icon: Users, color: "bg-blue-50 text-blue-600" },
    { title: "Jami o'quvchilarim", value: stats.total_students, icon: BookOpen, color: "bg-emerald-50 text-emerald-600" },
    { title: "Bugungi darslar", value: todayGroups.length, icon: Calendar, color: "bg-orange-50 text-[#ec5b13]" },
    { title: "Soatlik stavka", value: `${stats.hourly_rate.toLocaleString()} so'm`, icon: Clock, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-8">
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
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Mening guruhlarim</h2>
        {stats.groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Users size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-slate-500">Sizga biriktirilgan guruhlar yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.groups.map((g) => {
              const isToday = g.meets_today;
              const canTakeAttendance = isToday;
              return (
                <div key={g.id} className={cn(
                  "bg-white rounded-2xl p-6 shadow-sm border flex flex-col gap-4",
                  isToday ? "border-[#ec5b13] ring-1 ring-[#ec5b13]/20" : "border-slate-200"
                )}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{g.name}</h3>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg">
                          BUGUN
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{g.course_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                      {g.schedule && <span>📅 {g.schedule}</span>}
                      {g.time && <span>⏰ {g.time}</span>}
                      {g.room && <span>🏫 {g.room}</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {g.students_count}/{g.capacity} o'quvchi
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartClass(g)}
                    disabled={!canTakeAttendance}
                    title={canTakeAttendance ? "Darsni boshlash" : "Bu guruhda bugun dars yo'q"}
                    className={cn(
                      "w-full px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2",
                      canTakeAttendance
                        ? "bg-[#ec5b13] hover:bg-orange-600 text-white shadow-lg shadow-orange-200"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Play size={18} />
                    {canTakeAttendance ? 'Darsni boshlash' : "Bugun dars yo'q"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              disabled={isSaving || sessionStudents.length === 0}
              className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              {isSaving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedGroup && (
            <div className="bg-orange-50 p-4 rounded-2xl flex items-center justify-between text-[#ec5b13] font-bold">
              <span>{new Date().toLocaleDateString('uz-UZ')}</span>
              <span>{sessionStudents.length} ta o'quvchi</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                const all: Record<number, AttendanceStatus> = {};
                sessionStudents.forEach((s) => { all[s.id] = 'present'; });
                setAttendance(all);
              }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100"
            >
              Hammasi keldi
            </button>
            <button
              onClick={() => {
                const all: Record<number, AttendanceStatus> = {};
                sessionStudents.forEach((s) => { all[s.id] = 'absent'; });
                setAttendance(all);
              }}
              className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100"
            >
              Hammasi kelmadi
            </button>
          </div>

          {sessionStudents.length === 0 ? (
            <p className="text-center text-slate-400 py-8">O'quvchilar topilmadi</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                      <img
                        src={student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => setAttendance((prev) => ({ ...prev, [student.id]: status }))}
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
    </div>
  );
}
