import React, { useEffect, useState, useCallback } from 'react';
import { GraduationCap, Plus, Loader2, Search, Phone, Star, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface Teacher {
  id: number;
  name: string;
  phone: string;
  specialty: string | null;
  status: string;
  rating?: number;
  salary_percent?: number;
  hourly_rate?: number;
}

const INPUT = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white";

const STATUS_STYLE: Record<string, string> = {
  'Faol':   'bg-emerald-50 text-emerald-700',
  'Nofaol': 'bg-slate-100 text-slate-500',
};

function genPassword() {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'Teacher' + Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join('') + '1';
}

export const Teachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', specialty: '', status: 'Faol', email: '', password: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers', { params: { limit: 200 } });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
      setTeachers(list);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = teachers.filter(t =>
    !search ||
    (t.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.specialty ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Ism, telefon, email va parol majburiy");
      return;
    }
    setSaving(true);
    try {
      await api.post('/teachers', {
        name: form.name,
        phone: form.phone,
        specialty: form.specialty || null,
        status: form.status,
        email: form.email,
        password: form.password,
      });
      setModalOpen(false);
      setForm({ name: '', phone: '', specialty: '', status: 'Faol', email: '', password: '' });
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <GraduationCap size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">O'qituvchilar</h1>
            <p className="text-sm text-slate-400">{teachers.length} ta o'qituvchi</p>
          </div>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600">
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Ism yoki mutaxassislik..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap size={36} className="mx-auto mb-2 opacity-30" />
          <p>O'qituvchi topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="size-11 rounded-xl bg-purple-50 flex items-center justify-center font-black text-base text-purple-600 flex-shrink-0">
                  {(t.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{t.name}</p>
                  {t.specialty && <p className="text-xs text-slate-400 mt-0.5">{t.specialty}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {t.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Phone size={11} />{t.phone}</span>
                {(t.rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    {t.rating?.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Yangi o'qituvchi</h2>
              <button type="button" onClick={() => { setModalOpen(false); setError(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4 overflow-y-auto">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Ism Familiya *</label>
                <input className={INPUT} placeholder="Botir Toshmatov" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Telefon *</label>
                <input className={INPUT} placeholder="+998901234567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Mutaxassislik</label>
                <input className={INPUT} placeholder="Ingliz tili" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Email *</label>
                <input type="email" className={INPUT} placeholder="teacher@school.uz" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Parol *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={`${INPUT} pr-20`} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setForm(p => ({ ...p, password: genPassword() }))} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg" title="Avtomatik parol">
                      <RefreshCw size={13} />
                    </button>
                    <button type="button" onClick={() => setShowPw(v => !v)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Status</label>
                <select className={INPUT} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option>Faol</option><option>Nofaol</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setError(''); }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Bekor</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
