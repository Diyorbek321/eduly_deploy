import React, { useEffect, useState } from 'react';
import { Users, Plus, Loader2, Search, Phone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Student {
  id: number;
  full_name: string;
  phone: string;
  status: string;
  balance: number;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  'Faol': 'bg-emerald-50 text-emerald-600',
  'Muzlatilgan': 'bg-amber-50 text-amber-600',
  'Ketgan': 'bg-rose-50 text-rose-600',
};

interface AddStudentForm {
  full_name: string;
  phone: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
}

const EMPTY_FORM: AddStudentForm = {
  full_name: '',
  phone: '',
  gender: 'Erkak',
  parent_name: '',
  parent_phone: '',
};

export const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AddStudentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setStudents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
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
      await api.post('/students', form);
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
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">O'quvchilar</h1>
            <p className="text-sm text-slate-400">{students.length} ta o'quvchi</p>
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
          placeholder="Ism yoki telefon bo'yicha qidiring..."
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
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Ism</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Telefon</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Balans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">O'quvchi topilmadi</td>
                </tr>
              ) : filtered.map(s => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/students/${s.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-sm text-slate-500 flex-shrink-0">
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5"><Phone size={12} />{s.phone}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <span className={`font-bold text-sm ${s.balance < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                      {(s.balance ?? 0).toLocaleString()} UZS
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Yangi o'quvchi</h2>
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
                  placeholder="Ali Valiyev"
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
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Jins</label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                >
                  <option value="Erkak">Erkak</option>
                  <option value="Ayol">Ayol</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Ota-ona ismi</label>
                <input
                  type="text"
                  value={form.parent_name}
                  onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Vali Valiyev"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Ota-ona telefoni</label>
                <input
                  type="text"
                  value={form.parent_phone}
                  onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="+998901234567"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setError(''); }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
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
