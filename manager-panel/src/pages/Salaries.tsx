import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, Calendar, Calculator, Check } from 'lucide-react';
import api from '../lib/api';

interface Salary {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  month: string;
  base_amount: number;
  bonus_amount?: number;
  total_amount: number;
  is_paid: boolean;
  paid_at?: string | null;
}

interface Teacher {
  id: number;
  full_name: string;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const Salaries = () => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [calculating, setCalculating] = useState<number | null>(null);
  const [paying, setPaying] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        api.get('/salaries', { params: { month } }),
        api.get('/teachers'),
      ]);
      setSalaries(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.items ?? []));
      setTeachers(Array.isArray(tRes.data) ? tRes.data : (tRes.data?.items ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleCalculate = async (teacherId: number) => {
    setCalculating(teacherId);
    try {
      await api.post('/salaries/calculate', {
        teacher_id: teacherId,
        month,
        period: month,
      });
      await load();
    } catch {
      // ignore
    } finally {
      setCalculating(null);
    }
  };

  const handleMarkPaid = async (salaryId: number) => {
    setPaying(salaryId);
    try {
      await api.post(`/salaries/${salaryId}/pay`);
      await load();
    } catch {
      // ignore
    } finally {
      setPaying(null);
    }
  };

  // Teachers without salary for this month
  const salaryTeacherIds = new Set(salaries.map(s => s.teacher_id));
  const teachersWithoutSalary = teachers.filter(t => !salaryTeacherIds.has(t.id));

  const totalPaid = salaries.filter(s => s.is_paid).reduce((acc, s) => acc + s.total_amount, 0);
  const totalPending = salaries.filter(s => !s.is_paid).reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <CreditCard size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Maoshlar</h1>
            <p className="text-sm text-slate-400">O'qituvchilar maoshi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-slate-400" />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">To'langan</p>
            <p className="text-2xl font-black text-emerald-600">{totalPaid.toLocaleString()} <span className="text-sm font-normal text-slate-400">UZS</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Kutilmoqda</p>
            <p className="text-2xl font-black text-amber-500">{totalPending.toLocaleString()} <span className="text-sm font-normal text-slate-400">UZS</span></p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : (
        <>
          {/* Salary list */}
          {salaries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-black text-slate-900">Hisoblangan maoshlar</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {salaries.map(s => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="size-10 rounded-xl bg-violet-50 flex items-center justify-center font-black text-violet-400 flex-shrink-0">
                      {(s.teacher_name ?? 'T').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm">{s.teacher_name ?? `O'qituvchi #${s.teacher_id}`}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>Asosiy: {(s.base_amount ?? 0).toLocaleString()}</span>
                        {s.bonus_amount !== undefined && s.bonus_amount > 0 && (
                          <span className="text-emerald-500">+{s.bonus_amount.toLocaleString()} bonus</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-900">{s.total_amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></p>
                    </div>
                    <div className="flex-shrink-0">
                      {s.is_paid ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                          <Check size={12} /> To'langan
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(s.id)}
                          disabled={paying === s.id}
                          className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {paying === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          To'lash
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teachers without salary */}
          {teachersWithoutSalary.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-black text-slate-900">Hisoblanmagan o'qituvchilar</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {teachersWithoutSalary.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 flex-shrink-0">
                      {t.full_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 font-bold text-slate-900 text-sm">{t.full_name}</p>
                    <button
                      type="button"
                      onClick={() => handleCalculate(t.id)}
                      disabled={calculating === t.id}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#ec5b13] hover:bg-orange-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {calculating === t.id ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
                      Hisoblash
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {salaries.length === 0 && teachersWithoutSalary.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              O'qituvchilar topilmadi
            </div>
          )}
        </>
      )}
    </div>
  );
};
