import React, { useEffect, useState } from 'react';
import { CalendarCheck, Loader2, Check } from 'lucide-react';
import api from '../lib/api';

interface Group {
  id: number;
  name: string;
}

interface AttendanceRecord {
  student_id: number;
  student_name: string;
  status: AttendanceStatus;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present',  label: 'Keldi',       color: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'absent',   label: 'Kelmadi',     color: 'bg-rose-500 text-white border-rose-500' },
  { value: 'late',     label: 'Kech',        color: 'bg-amber-500 text-white border-amber-500' },
  { value: 'excused',  label: 'Sababli',     color: 'bg-sky-500 text-white border-sky-500' },
];

const STATUS_IDLE: Record<AttendanceStatus, string> = {
  present:  'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
  absent:   'border-rose-200 text-rose-500 hover:bg-rose-50',
  late:     'border-amber-200 text-amber-500 hover:bg-amber-50',
  excused:  'border-sky-200 text-sky-500 hover:bg-sky-50',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const Attendance = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await api.get('/groups');
        const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setGroups(data);
      } finally {
        setGroupsLoading(false);
      }
    };
    loadGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    const load = async () => {
      setLoading(true);
      setSaved(false);
      try {
        const res = await api.get('/attendances', {
          params: { group_id: selectedGroup, date },
        });
        const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        if (data.length > 0) {
          setRecords(data.map((d: { student_id: number; student_name?: string; status?: AttendanceStatus }) => ({
            student_id: d.student_id,
            student_name: d.student_name ?? `O'quvchi #${d.student_id}`,
            status: d.status ?? 'absent',
          })));
        } else {
          // Load group students as template
          const gRes = await api.get(`/groups/${selectedGroup}/students`);
          const students = Array.isArray(gRes.data) ? gRes.data : (gRes.data?.items ?? []);
          setRecords(students.map((s: { id: number; full_name: string }) => ({
            student_id: s.id,
            student_name: s.full_name,
            status: 'present' as AttendanceStatus,
          })));
        }
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedGroup, date]);

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setRecords(prev =>
      prev.map(r => r.student_id === studentId ? { ...r, status } : r)
    );
    setSaved(false);
  };

  const handleSubmit = async () => {
    if (!selectedGroup || records.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        records.map(r =>
          api.post('/attendances', {
            group_id: Number(selectedGroup),
            student_id: r.student_id,
            date,
            status: r.status,
          })
        )
      );
      setSaved(true);
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CalendarCheck size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Davomat</h1>
          <p className="text-sm text-slate-400">Kunlik davomat belgilash</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Guruh</label>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            disabled={groupsLoading}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">Guruhni tanlang...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Sana</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          />
        </div>
      </div>

      {/* Summary */}
      {records.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{presentCount}</p>
            <p className="text-xs text-emerald-500 font-bold">Keldi</p>
          </div>
          <div className="flex-1 bg-rose-50 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-rose-500">{absentCount}</p>
            <p className="text-xs text-rose-400 font-bold">Kelmadi</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-slate-700">{records.length}</p>
            <p className="text-xs text-slate-400 font-bold">Jami</p>
          </div>
        </div>
      )}

      {/* Attendance list */}
      {!selectedGroup ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          Davomatni ko'rish uchun guruh tanlang
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          O'quvchilar topilmadi
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-50">
              {records.map(r => (
                <div key={r.student_id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-sm text-slate-500 flex-shrink-0">
                    {r.student_name.charAt(0).toUpperCase()}
                  </div>
                  <p className="flex-1 font-bold text-slate-900 text-sm">{r.student_name}</p>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(r.student_id, opt.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          r.status === opt.value
                            ? opt.color
                            : `border-slate-200 text-slate-400 hover:border-slate-300`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || saved}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#ec5b13] text-white hover:bg-orange-600'
              }`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
              {saved ? "Saqlandi!" : "Saqlash"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
