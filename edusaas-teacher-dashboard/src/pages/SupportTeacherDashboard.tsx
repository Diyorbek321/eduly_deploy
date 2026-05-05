import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, RefreshCw, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface Booking {
  id: number;
  student_name: string;
  teacher_id: number;
  date: string;
  time: string;
  topic: string | null;
  status: string;
  teacher_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Kutilmoqda': 'bg-amber-50 text-amber-700',
  'Tasdiqlangan': 'bg-emerald-50 text-emerald-700',
  'Bekor qilingan': 'bg-rose-50 text-rose-700',
  'Yakunlangan': 'bg-slate-100 text-slate-600',
};

export function SupportTeacherDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.get<{ teacher_id: number | null }>('/auth/me');
      setTeacherId(me.data.teacher_id);
      const res = await api.get<Booking[]>('/support-bookings/');
      setBookings(me.data.teacher_id
        ? res.data.filter((b) => b.teacher_id === me.data.teacher_id)
        : res.data);
    } catch (err: any) {
      setError(err.message || 'Xatolik');
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

  if (error) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="font-bold">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const pending = bookings.filter((b) => b.status === 'Kutilmoqda').length;
  const confirmed = bookings.filter((b) => b.status === 'Tasdiqlangan').length;
  const done = bookings.filter((b) => b.status === 'Yakunlangan').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Support bandlovlar</h1>
          <p className="text-slate-500 mt-1">Menga biriktirilgan bandlovlar ({bookings.length} ta)</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} />Yangilash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={Clock} color="bg-amber-50 text-amber-600" label="Kutilmoqda" value={pending} />
        <Card icon={CheckCircle} color="bg-emerald-50 text-emerald-600" label="Tasdiqlangan" value={confirmed} />
        <Card icon={CalendarIcon} color="bg-slate-100 text-slate-600" label="Yakunlangan" value={done} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Bandlovlar ro'yxati</h3>
        </div>
        {bookings.length === 0 ? (
          <p className="text-center py-12 text-slate-400">Sizga biriktirilgan bandlovlar yo'q</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-orange-50 text-[#ec5b13] flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{b.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {b.date} • {b.time}
                      {b.topic && ` • ${b.topic}`}
                    </p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 text-xs font-bold rounded-lg", STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600')}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`size-14 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
      </div>
    </div>
  );
}
