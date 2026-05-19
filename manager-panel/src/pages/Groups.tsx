import React, { useEffect, useState } from 'react';
import { Layers, Plus, Loader2, Search, X } from 'lucide-react';
import api from '../lib/api';

interface Group {
  id: number;
  name: string;
  course_name?: string;
  teacher_name?: string;
  students_count: number;
  status: string;
  schedule?: string;
  time?: string;
}

interface Course { id: number; name: string }
interface Teacher { id: number; full_name: string }

interface AddGroupForm {
  name: string;
  course_id: string;
  teacher_id: string;
  level: string;
  schedule: string;
  time: string;
  capacity: string;
}

const EMPTY_FORM: AddGroupForm = {
  name: '',
  course_id: '',
  teacher_id: '',
  level: 'Boshlang\'ich',
  schedule: 'Dushanba, Chorshanba, Juma',
  time: '09:00',
  capacity: '15',
};

const STATUS_STYLE: Record<string, string> = {
  'Faol': 'bg-emerald-50 text-emerald-600',
  'Tugagan': 'bg-slate-100 text-slate-500',
  'Muzlatilgan': 'bg-amber-50 text-amber-600',
};

export const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AddGroupForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [gRes, cRes, tRes] = await Promise.all([
        api.get('/groups'),
        api.get('/courses'),
        api.get('/teachers'),
      ]);
      setGroups(Array.isArray(gRes.data) ? gRes.data : (gRes.data?.items ?? []));
      setCourses(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items ?? []));
      setTeachers(Array.isArray(tRes.data) ? tRes.data : (tRes.data?.items ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.course_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.course_id || !form.teacher_id) {
      setError("Nomi, kurs va o'qituvchi majburiy");
      return;
    }
    setSaving(true);
    try {
      await api.post('/groups', {
        name: form.name,
        course_id: Number(form.course_id),
        teacher_id: Number(form.teacher_id),
        level: form.level,
        schedule: form.schedule,
        time: form.time,
        capacity: Number(form.capacity),
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Layers size={20} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Guruhlar</h1>
            <p className="text-sm text-slate-400">{groups.length} ta guruh</p>
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
          placeholder="Guruh nomi bo'yicha qidiring..."
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
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Guruh</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Kurs</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">O'qituvchi</th>
                <th className="text-center px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">O'quvchilar</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Guruh topilmadi</td></tr>
              ) : filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-teal-50 flex items-center justify-center font-black text-teal-400 text-xs flex-shrink-0">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{g.name}</p>
                        {g.schedule && <p className="text-xs text-slate-400">{g.time}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{g.course_name ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-500 hidden lg:table-cell">{g.teacher_name ?? '—'}</td>
                  <td className="px-5 py-4 text-center font-bold text-slate-700">{g.students_count ?? 0}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[g.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {g.status}
                    </span>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-black text-slate-900">Yangi guruh</h2>
              <button type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setError(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Guruh nomi *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Ingliz tili A1-1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Kurs *</label>
                <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                  <option value="">Tanlang...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">O'qituvchi *</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                  <option value="">Tanlang...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Daraja</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                  <option>Boshlang'ich</option>
                  <option>O'rta</option>
                  <option>Yuqori</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Jadval</label>
                <input type="text" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Dushanba, Chorshanba, Juma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Vaqt</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Sig'im</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    min={1} max={50}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
                </div>
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
