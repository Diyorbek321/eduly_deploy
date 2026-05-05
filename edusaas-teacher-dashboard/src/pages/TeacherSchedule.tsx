import React, { useState, useEffect } from 'react';
import { Clock, Play, RefreshCw, MapPin, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';

interface GroupSlot {
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
  teacher_name: string;
  groups: GroupSlot[];
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
  present: 'Keldi', absent: 'Kelmadi', late: 'Kechikdi', excused: 'Sababli',
};
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
};

const DAYS_UZ = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const DAY_KEYS = ['dush', 'sesh', 'chor', 'pay', 'jum', 'shan', 'yak'];

function groupOnDay(schedule: string | null | undefined, dayIdx: number): boolean {
  if (!schedule) return false;
  const s = schedule.toLowerCase();
  if (s.includes(DAY_KEYS[dayIdx])) return true;
  // dayIdx: 0=Mon ... 6=Sun
  const jsDay = (dayIdx + 1) % 7;
  if (jsDay % 2 === 1 && s.includes('toq')) return true;
  if (jsDay % 2 === 0 && jsDay !== 0 && s.includes('juft')) return true;
  if (s.includes('har kuni')) return true;
  return false;
}

export function TeacherSchedule() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupSlot | null>(null);
  const [sessionStudents, setSessionStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Stats>('/teacher/stats');
      setStats(res.data);
    } catch (err: any) {
      setError(err.message || 'Jadval yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttendance = async (group: GroupSlot) => {
    if (!group.meets_today) {
      alert("Bu guruhda bugun dars yo'q. Davomat faqat dars kunida olinadi.");
      return;
    }
    setSelectedGroup(group);
    setIsAttendanceOpen(true);
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
        student_id: Number(student_id), status,
      }));
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/teacher/attendance/bulk', {
        group_id: selectedGroup.id, date: today, records,
      });
      setIsAttendanceOpen(false);
      alert('✅ Davomat saqlandi!');
    } catch (err: any) {
      alert(err.message || 'Xatolik yuz berdi');
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
        <p className="font-bold">{error || "Jadval topilmadi"}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const todayIdx = (new Date().getDay() + 6) % 7;
  const totalWeekly = DAYS_UZ.reduce((sum, _, idx) =>
    sum + stats.groups.filter((g) => groupOnDay(g.schedule, idx)).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Dars jadvali</h1>
          <p className="text-slate-500 mt-1">
            Haftalik darslar • Jami: {totalWeekly} ta dars
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS_UZ.map((dayName, idx) => {
          const isToday = idx === todayIdx;
          const dayGroups = stats.groups.filter((g) => groupOnDay(g.schedule, idx));

          return (
            <div key={idx} className={cn(
              "bg-white rounded-2xl border overflow-hidden",
              isToday ? "border-[#ec5b13] ring-1 ring-[#ec5b13]/20" : "border-slate-200"
            )}>
              <div className={cn(
                "p-3 text-center border-b",
                isToday ? "bg-[#ec5b13] border-[#ec5b13]" : "bg-slate-50 border-slate-200"
              )}>
                <p className={cn("text-xs font-black uppercase tracking-wider",
                  isToday ? "text-white/80" : "text-slate-400")}>
                  {dayName.substring(0, 3)}
                </p>
                {dayGroups.length > 0 && (
                  <p className={cn("text-[10px] font-black mt-0.5",
                    isToday ? "text-white/70" : "text-[#ec5b13]")}>
                    {dayGroups.length} ta dars
                  </p>
                )}
              </div>

              <div className="p-2 space-y-2 min-h-[100px]">
                {dayGroups.length === 0 ? (
                  <div className="text-center py-4 text-slate-300 text-xs font-bold">Dars yo'q</div>
                ) : (
                  dayGroups.map((g) => (
                    <div key={g.id}
                      className={cn(
                        "rounded-xl p-2.5 border-l-4",
                        isToday ? "bg-blue-50 border-blue-400 cursor-pointer hover:opacity-90" : "bg-slate-50 border-slate-300 opacity-70"
                      )}
                      onClick={() => isToday && handleOpenAttendance(g)}
                    >
                      <p className={cn("text-xs font-black truncate", isToday ? "text-blue-800" : "text-slate-500")}>{g.name}</p>
                      {g.time && (
                        <p className={cn("text-[10px] font-bold mt-0.5", isToday ? "text-blue-600" : "text-slate-400")}>
                          <Clock size={8} className="inline mr-1" />{g.time}
                        </p>
                      )}
                      {g.room && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={8} />{g.room}
                        </p>
                      )}
                      {isToday && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenAttendance(g); }}
                          className="mt-2 w-full flex items-center justify-center gap-1 py-1 bg-white/70 hover:bg-white rounded-lg text-[10px] font-bold text-slate-600"
                        >
                          <Play size={10} />Davomat
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Barcha guruhlar ({stats.groups.length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.groups.length === 0 ? (
            <p className="text-center py-8 text-slate-400">Guruhlar topilmadi</p>
          ) : (
            stats.groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-orange-50 text-[#ec5b13] flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{g.name}</p>
                    <p className="text-sm text-slate-500">
                      {g.course_name}
                      {g.schedule && ` • ${g.schedule}`}
                      {g.time && ` • ${g.time}`}
                      {g.room && ` • ${g.room}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAttendance(g)}
                  disabled={!g.meets_today}
                  title={g.meets_today ? "Davomat olish" : "Bu guruhda bugun dars yo'q"}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold",
                    g.meets_today
                      ? "bg-[#ec5b13] text-white hover:bg-orange-600"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Play size={14} />
                  {g.meets_today ? 'Davomat' : "Bugun yo'q"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        title={selectedGroup ? `${selectedGroup.name} — Davomat` : 'Davomat'}
        footer={
          <>
            <button onClick={() => setIsAttendanceOpen(false)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600">
              Bekor qilish
            </button>
            <button onClick={handleSaveAttendance} disabled={isSaving || sessionStudents.length === 0}
              className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
              {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {selectedGroup && (
            <div className="bg-orange-50 p-3 rounded-xl flex justify-between text-sm font-bold text-[#ec5b13]">
              <span>{new Date().toLocaleDateString('uz-UZ')}</span>
              <span>{sessionStudents.length} ta o'quvchi</span>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => { const a: Record<number, AttendanceStatus> = {}; sessionStudents.forEach((s) => { a[s.id] = 'present'; }); setAttendance(a); }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
              Hammasi keldi
            </button>
            <button
              onClick={() => { const a: Record<number, AttendanceStatus> = {}; sessionStudents.forEach((s) => { a[s.id] = 'absent'; }); setAttendance(a); }}
              className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">
              Hammasi kelmadi
            </button>
          </div>
          {sessionStudents.length === 0 ? (
            <p className="text-center text-slate-400 py-6">O'quvchilar topilmadi</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sessionStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`}
                      alt={student.name}
                      className="size-9 rounded-lg object-cover"
                    />
                    <span className="font-bold text-sm text-slate-900">{student.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((s) => (
                      <button key={s}
                        onClick={() => setAttendance((p) => ({ ...p, [student.id]: s }))}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-bold border transition-all",
                          attendance[student.id] === s
                            ? STATUS_COLORS[s] + ' border-current'
                            : 'bg-white text-slate-400 border-slate-200'
                        )}>
                        {STATUS_LABELS[s]}
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
