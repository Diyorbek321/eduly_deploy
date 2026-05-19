import React, { useEffect, useState } from 'react';
import { Wallet, Plus, Loader2, Search, X } from 'lucide-react';
import api from '../lib/api';

interface Payment {
  id: number;
  student_name?: string;
  student_id?: number;
  amount: number;
  payment_method: string;
  status?: string;
  created_at: string;
}

interface Student {
  id: number;
  full_name: string;
}

interface AddPaymentForm {
  student_id: string;
  amount: string;
  payment_method: string;
  date: string;
}

const METHODS = ['Naqd', 'Click', 'Payme', 'Karta'];

const STATUS_STYLE: Record<string, string> = {
  'paid':     'bg-emerald-50 text-emerald-600',
  'pending':  'bg-amber-50 text-amber-600',
  'overdue':  'bg-rose-50 text-rose-600',
  'To\'langan': 'bg-emerald-50 text-emerald-600',
};

const METHOD_STYLE: Record<string, string> = {
  'Naqd':  'bg-emerald-50 text-emerald-700',
  'Click': 'bg-blue-50 text-blue-600',
  'Payme': 'bg-sky-50 text-sky-600',
  'Karta': 'bg-violet-50 text-violet-600',
  'Cash':  'bg-emerald-50 text-emerald-700',
  'Card':  'bg-violet-50 text-violet-600',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: AddPaymentForm = {
  student_id: '',
  amount: '',
  payment_method: 'Naqd',
  date: todayStr(),
};

export const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AddPaymentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/payments', { params: { limit: 50 } }),
        api.get('/students'),
      ]);
      setPayments(Array.isArray(pRes.data) ? pRes.data : (pRes.data?.items ?? []));
      setStudents(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.items ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredPayments = payments.filter(p =>
    (p.student_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 8);

  const selectedStudent = students.find(s => String(s.id) === form.student_id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.student_id || !form.amount) {
      setError("O'quvchi va summa majburiy");
      return;
    }
    setSaving(true);
    try {
      await api.post('/payments', {
        student_id: Number(form.student_id),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.date,
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setStudentSearch('');
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail ?? "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Wallet size={20} className="text-[#ec5b13]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">To'lovlar</h1>
            <p className="text-sm text-slate-400">{payments.length} ta to'lov</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">To'lov kiritish</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="O'quvchi nomi bo'yicha qidiring..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-900"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">O'quvchi</th>
                <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Summa</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Usul</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Sana</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">To'lov topilmadi</td></tr>
              ) : filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 flex-shrink-0">
                        {(p.student_name ?? 'O').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{p.student_name ?? `#${p.student_id}`}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900">
                    {(p.amount ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${METHOD_STYLE[p.payment_method] ?? 'bg-slate-100 text-slate-500'}`}>
                      {p.payment_method}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                    {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {p.status && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {p.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">To'lov kiritish</h2>
              <button type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setStudentSearch(''); setError(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}

              {/* Student search */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">O'quvchi *</label>
                {selectedStudent ? (
                  <div className="flex items-center gap-2 border border-emerald-200 rounded-xl px-3.5 py-2.5 bg-emerald-50">
                    <span className="flex-1 text-sm font-bold text-slate-900">{selectedStudent.full_name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, student_id: '' }))} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="O'quvchi izlash..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    {studentSearch && filteredStudents.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                        {filteredStudents.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, student_id: String(s.id) })); setStudentSearch(''); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors font-medium text-slate-900"
                          >
                            {s.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Summa (UZS) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="500000"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">To'lov usuli</label>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.payment_method === m
                          ? 'bg-[#ec5b13] text-white border-[#ec5b13]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Sana</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setStudentSearch(''); setError(''); }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Bekor
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
