import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Building2, Mail, KeyRound, Trash2, ToggleLeft,
  ToggleRight, Copy, CheckCheck, Plus, X, Loader2, ExternalLink,
  ShieldCheck, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import api from '@/src/lib/api';

interface Manager {
  id: number;
  full_name: string | null;
  email: string;
  center_id: number | null;
  center_name: string | null;
  is_active: boolean;
}

interface Branch {
  id: number;
  name: string;
  slug: string;
}

const MANAGER_PANEL_URL = 'http://localhost:3002';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
      {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

function CreateManagerModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', center_id: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const genPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    set('password', `Eduly${pw.slice(0, 8)}1`);
  };

  const submit = async () => {
    if (!form.full_name || !form.email || !form.password || !form.center_id) {
      setError("Barcha maydonlar majburiy"); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/branch-managers/', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        center_id: Number(form.center_id),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.detail ?? 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Yangi filial menejeri</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">To'liq ism *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Masalan: Jasur Toshmatov"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="manager@filial.uz"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Parol *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Kamida 8 ta belgi"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-20 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={genPassword} title="Avtomatik parol" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <RefreshCw size={13} />
                </button>
                <button type="button" onClick={() => setShowPw(v => !v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Kamida 8 ta belgi, katta va kichik harf, raqam</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Filial *</label>
            <select value={form.center_id} onChange={e => set('center_id', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
              <option value="">— Filialni tanlang —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Login info preview */}
          {form.email && form.password && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
              <p className="font-bold text-slate-600 mb-1.5">Kirish ma'lumotlari (nusxa oling):</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">URL:</span>
                <span className="font-mono text-slate-800 truncate">{MANAGER_PANEL_URL}</span>
                <CopyButton text={MANAGER_PANEL_URL} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">{form.email}</span>
                <CopyButton text={form.email} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Parol:</span>
                <span className="font-mono text-slate-800">{form.password}</span>
                <CopyButton text={form.password} />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Bekor
          </button>
          <button type="button" onClick={submit} disabled={loading}
            className="flex-1 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            Yaratish
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ manager, onClose }: { manager: Manager; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const genPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const p = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setPw(`Eduly${p.slice(0, 8)}1`);
  };

  const submit = async () => {
    if (!pw) { setError("Yangi parol kiriting"); return; }
    setLoading(true); setError('');
    try {
      await api.patch(`/branch-managers/${manager.id}/password`, { new_password: pw });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-black text-slate-900 mb-4">Parolni tiklash — {manager.full_name || manager.email}</h3>
        {done ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 font-bold">
              Parol muvaffaqiyatli yangilandi
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
              <span className="font-mono text-slate-800">{pw}</span>
              <CopyButton text={pw} />
            </div>
            <button type="button" onClick={onClose} className="w-full py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold">Yopish</button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Yangi parol</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-20 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={genPassword} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><RefreshCw size={13} /></button>
                  <button type="button" onClick={() => setShowPw(v => !v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Bekor</button>
              <button type="button" onClick={submit} disabled={loading}
                className="flex-1 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 size={13} className="animate-spin" />} Yangilash
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const BranchManagers = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<Manager | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mgRes, brRes] = await Promise.all([
        api.get('/branch-managers/'),
        api.get('/branches/'),
      ]);
      setManagers(Array.isArray(mgRes.data) ? mgRes.data : (mgRes.data?.data ?? []));
      const bl = Array.isArray(brRes.data) ? brRes.data : (brRes.data?.data ?? []);
      setBranches(bl);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleActive = async (m: Manager) => {
    setToggling(m.id);
    try {
      const res = await api.patch(`/branch-managers/${m.id}/toggle-active`);
      setManagers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: res.data?.is_active ?? !m.is_active } : x));
    } finally {
      setToggling(null);
    }
  };

  const deleteManager = async (m: Manager) => {
    if (!confirm(`"${m.full_name || m.email}" menejerini o'chirish?`)) return;
    await api.delete(`/branch-managers/${m.id}`);
    setManagers(prev => prev.filter(x => x.id !== m.id));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      <Header title="Filial menejerlar" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto w-full">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <ShieldCheck size={20} className="text-[#ec5b13] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-slate-800 mb-0.5">Filial menejerlari haqida</p>
            <p className="text-slate-500">
              Menejerlar o'zlarining fililiga tayinlangan <strong>ADMIN</strong> hisoblari. Ular{' '}
              <a href={MANAGER_PANEL_URL} target="_blank" rel="noreferrer"
                className="text-[#ec5b13] font-bold underline underline-offset-2 inline-flex items-center gap-1">
                Manager Panel <ExternalLink size={11} />
              </a>
              {' '}orqali kiradi va faqat o'z filiali ma'lumotlarini ko'radi.
            </p>
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Menejerlar</h2>
            <p className="text-sm text-slate-400 mt-0.5">{managers.length} ta hisob</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} /> Yangi menejer
          </button>
        </div>

        {/* Manager panel URL */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5">
          <div className="size-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <ExternalLink size={16} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 mb-0.5">Manager Panel URL</p>
            <p className="text-sm font-mono text-slate-900 truncate">{MANAGER_PANEL_URL}</p>
          </div>
          <CopyButton text={MANAGER_PANEL_URL} />
          <a href={MANAGER_PANEL_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50">
            Ochish <ExternalLink size={11} />
          </a>
        </div>

        {/* Managers table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-3" /> Yuklanmoqda...
          </div>
        ) : managers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <UserPlus size={40} />
            <p className="font-bold">Hali menejer yo'q</p>
            <button type="button" onClick={() => setShowCreate(true)}
              className="text-sm text-[#ec5b13] font-bold hover:underline">Birinchi menejerni yarating</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Menejer</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Filial</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Holat</th>
                  <th className="text-right px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center font-black text-sm text-[#ec5b13] flex-shrink-0">
                          {(m.full_name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{m.full_name || '—'}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                            <Mail size={11} />{m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {m.center_name ? (
                        <span className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Building2 size={13} className="text-slate-400" />
                          {m.center_name}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.is_active ? 'Faol' : 'Bloklangan'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(m)}
                          disabled={toggling === m.id}
                          title={m.is_active ? 'Bloklash' : 'Faollashtirish'}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                        >
                          {toggling === m.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : m.is_active ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget(m)}
                          title="Parolni tiklash"
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteManager(m)}
                          title="O'chirish"
                          className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateManagerModal
          branches={branches}
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal manager={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
};
