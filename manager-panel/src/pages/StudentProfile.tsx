import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Phone, User, Users, Wallet, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

interface Group {
  id: number;
  name: string;
  course_name?: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  created_at: string;
  status?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface StudentDetail {
  id: number;
  full_name: string;
  phone: string;
  status: string;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  balance: number;
  groups?: Group[];
  payments?: Payment[];
  attendance_summary?: AttendanceSummary;
}

const STATUS_STYLE: Record<string, string> = {
  'Faol': 'bg-emerald-50 text-emerald-600',
  'Muzlatilgan': 'bg-amber-50 text-amber-600',
  'Ketgan': 'bg-rose-50 text-rose-600',
};

const fmt = (n: number) => n.toLocaleString();

export const StudentProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/students/${id}`);
        setStudent(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <User size={40} />
        <p className="font-bold">O'quvchi topilmadi</p>
        <button type="button" onClick={() => navigate(-1)} className="text-[#ec5b13] text-sm font-bold">Orqaga</button>
      </div>
    );
  }

  const attendance = student.attendance_summary;
  const attendancePct = attendance && attendance.total > 0
    ? Math.round((attendance.present / attendance.total) * 100)
    : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[900px] mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold transition-colors"
      >
        <ArrowLeft size={16} /> Orqaga
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start gap-5">
        <div className="size-16 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-2xl text-indigo-400 flex-shrink-0">
          {student.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-slate-900">{student.full_name}</h1>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Phone size={12} /> {student.phone}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[student.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {student.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            {student.gender && <span>Jins: <b className="text-slate-700">{student.gender}</b></span>}
            {student.parent_name && <span>Ota-onasi: <b className="text-slate-700">{student.parent_name}</b></span>}
            {student.parent_phone && (
              <span className="flex items-center gap-1"><Phone size={11} /><b className="text-slate-700">{student.parent_phone}</b></span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-[#ec5b13]" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Balans</p>
          </div>
          <p className={`text-2xl font-black ${student.balance < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
            {fmt(student.balance)} <span className="text-sm font-normal text-slate-400">UZS</span>
          </p>
          {student.balance < 0 && (
            <p className="text-xs text-rose-400 flex items-center gap-1 mt-1"><AlertTriangle size={11} />Qarzdor</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-indigo-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Guruhlar</p>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {student.groups?.length ?? 0} <span className="text-sm font-normal text-slate-400">ta</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-emerald-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Davomat</p>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {attendancePct !== null ? `${attendancePct}%` : '—'}
          </p>
          {attendance && (
            <p className="text-xs text-slate-400 mt-1">{attendance.present}/{attendance.total} dars</p>
          )}
        </div>
      </div>

      {/* Groups */}
      {(student.groups?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900">Guruhlar</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {student.groups!.map(g => (
              <div key={g.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="size-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Users size={14} className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{g.name}</p>
                  {g.course_name && <p className="text-xs text-slate-400">{g.course_name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      {(student.payments?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900">To'lovlar tarixi</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Sana</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Usul</th>
                <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {student.payments!.map(p => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-medium">{p.payment_method}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{fmt(p.amount)} UZS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
