import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Loader2, Search, Phone, X,
  AlertTriangle, CheckCircle2, Snowflake, UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Student {
  id: number;
  name: string;
  phone: string;
  status: string;
  debt: number;
  gender: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  group_names?: string[];
}

const STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  'Faol':       { label: 'Faol',       cls: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={11} /> },
  'Muzlatilgan':{ label: 'Muzlatilgan',cls: 'bg-sky-50 text-sky-600',         icon: <Snowflake size={11} /> },
  'Kutishda':   { label: 'Kutishda',   cls: 'bg-amber-50 text-amber-600',     icon: <AlertTriangle size={11} /> },
  'Ketgan':     { label: 'Ketgan',     cls: 'bg-rose-50 text-rose-600',       icon: <UserX size={11} /> },
};

const INPUT = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white";

export const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', gender: 'Erkak', parent_name: '', parent_phone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { limit: 200 } });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
      setStudents(list);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s => {
    const matchSearch = !search ||
      (s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? '').includes(search);
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: students.length,
    Faol: students.filter(s => s.status === 'Faol').length,
    Muzlatilgan: students.filter(s => s.status === 'Muzlatilgan').length,
    Ketgan: students.filter(s => s.status === 'Ketgan').length,
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) { setError("Ism va telefon majburiy"); return; }
    setSaving(true);
    try {
      await api.post('/students', {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
      });
      setModalOpen(false);
      setForm({ name: '', phone: '', gender: 'Erkak', parent_name: '', parent_phone: '' });
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
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">O'quvchilar</h1>
            <p className="text-sm text-slate-400">{students.length} ta jami</p>
          </div>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600">
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ism yoki telefon..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
        {(['all','Faol','Muzlatilgan','Ketgan'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${filter === f ? 'bg-[#ec5b13] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'all' ? 'Barchasi' : f} ({counts[f as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p>O'quvchi topilmadi</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase">Ism</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase hidden sm:table-cell">Telefon</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase hidden md:table-cell">Qarz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(s => {
                  const st = STATUS[s.status];
                  return (
                    <tr key={s.id} onClick={() => navigate(`/students/${s.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center font-black text-sm text-[#ec5b13] flex-shrink-0">
                            {(s.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.name}</p>
                            {s.group_names && s.group_names.length > 0 && (
                              <p className="text-[11px] text-slate-400">{s.group_names[0]}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                        <span className="flex items-center gap-1.5"><Phone size={12} />{s.phone}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${st?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                          {st?.icon}{st?.label ?? s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        {(s.debt ?? 0) > 0 ? (
                          <span className="font-bold text-rose-500">{(s.debt).toLocaleString()} UZS</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Yangi o'quvchi</h2>
              <button type="button" onClick={() => { setModalOpen(false); setError(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4 overflow-y-auto">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
              {[
                { label: "Ism Familiya *", key: 'name', placeholder: 'Ali Valiyev' },
                { label: 'Telefon *', key: 'phone', placeholder: '+998901234567' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{f.label}</label>
                  <input className={INPUT} placeholder={f.placeholder}
                    value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Jins</label>
                <select className={INPUT} value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option>Erkak</option><option>Ayol</option>
                </select>
              </div>
              {[
                { label: "Ota-ona ismi", key: 'parent_name', placeholder: 'Vali Valiyev' },
                { label: 'Ota-ona telefoni', key: 'parent_phone', placeholder: '+998901234567' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{f.label}</label>
                  <input className={INPUT} placeholder={f.placeholder}
                    value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
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
