import React, { useEffect, useState } from 'react';
import { LifeBuoy, Loader2, Calendar, User } from 'lucide-react';
import api from '../lib/api';

interface Booking {
  id: number;
  teacher_name: string;
  student_name?: string;
  date: string;
  status: string;
  subject?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'pending':   'bg-amber-50 text-amber-600',
  'confirmed': 'bg-emerald-50 text-emerald-600',
  'completed': 'bg-sky-50 text-sky-600',
  'cancelled': 'bg-rose-50 text-rose-600',
  'Kutilmoqda': 'bg-amber-50 text-amber-600',
  'Tasdiqlangan': 'bg-emerald-50 text-emerald-600',
  'Bajarildi': 'bg-sky-50 text-sky-600',
  'Bekor qilindi': 'bg-rose-50 text-rose-600',
};

export const SupportTeachers = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/support-bookings');
        const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.data ?? []);
        setBookings(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
          <LifeBuoy size={20} className="text-sky-500" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Yordamchi o'qituvchilar</h1>
          <p className="text-sm text-slate-400">Bronlar ro'yxati</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <LifeBuoy size={32} className="mx-auto mb-3 opacity-30" />
          <p>Hozircha bronlar yo'q</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">O'qituvchi</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">O'quvchi</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Sana</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-sky-50 flex items-center justify-center font-black text-sky-400 text-xs flex-shrink-0">
                        {b.teacher_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{b.teacher_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5">
                      <User size={12} />
                      {b.student_name ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(b.date).toLocaleDateString('uz-UZ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
