import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Loader2, Search, Phone, Star, X } from 'lucide-react';
import api from '../lib/api';

interface Teacher {
  id: number;
  full_name: string;
  phone: string;
  specialty: string | null;
  status: string;
  rating?: number;
}

interface AddTeacherForm {
  full_name: string;
  phone: string;
  specialty: string;
  status: string;
}

const EMPTY_FORM: AddTeacherForm = {
  full_name: '',
  phone: '',
  specialty: '',
  status: 'Faol',
};

const STATUS_STYLE: Record<string, string> = {
  'Faol': 'bg-emerald-50 text-emerald-600',
  'Nofaol': 'bg-slate-100 text-slate-500',
  'Ketgan': 'bg-rose-50 text-rose-600',
};

export const Teachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AddTeacherForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers');
      const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setTeachers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.specialty ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError("Ism va telefon majburiy");
      return;
    }
    setSaving(true);
    try {
      await api.post('/teachers', form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
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
          <div className="size-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <GraduationCap size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">O'qituvchilar</h1>
            <p className="text-sm text-slate-400">{teachers.length} ta o'qituvchi</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Qo'shish</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ism yoki mutaxassislik bo'yicha qidiring..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-900"
        />
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
          O'qituvchi topilmadi
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="size-12 rounded-xl bg-purple-50 flex items-center justify-center font-black text-lg text-purple-400">
                  {t.full_name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {t.status}
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-sm">{t.full_name}</h3>
              {t.specialty && <p className="text-xs text-slate-400 mt-0.5">{t.specialty}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1"><Phone size={11} />{t.phone}</span>
                {t.rating !== undefined && (
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={11} fill="currentColor" />{t.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Yangi o'qituvchi</h2>
              <button type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setError(''); }} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Ism Familiya *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Botir Toshmatov"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Telefon *</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="+998901234567"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Mutaxassislik</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Ingliz tili"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                >
                  <option value="Faol">Faol</option>
                  <option value="Nofaol">Nofaol</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setError(''); }}
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
