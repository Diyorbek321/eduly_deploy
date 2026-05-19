import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Layers,
  Wallet,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Globe,
  Phone,
  MapPin,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import api from '@/src/lib/api';
import { useBranch, Branch } from '@/src/contexts/BranchContext';

interface BranchStats {
  branch: Branch;
  total_students: number;
  active_students: number;
  total_teachers: number;
  total_groups: number;
  total_revenue: number;
  total_debt: number;
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  OWNER: { label: 'Egasi', cls: 'bg-violet-100 text-violet-700' },
  BRANCH_ADMIN: { label: 'Admin', cls: 'bg-sky-100 text-sky-700' },
  ADMIN: { label: 'Admin', cls: 'bg-emerald-100 text-emerald-700' },
  SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-rose-100 text-rose-700' },
};

function StatPill({ icon: Icon, value, label, accent }: {
  icon: React.ElementType; value: string; label: string; accent: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`size-8 rounded-lg flex items-center justify-center`} style={{ background: `${accent}18` }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function BranchCard({ stats, onSelect, isActive }: {
  stats: BranchStats; onSelect: () => void; isActive: boolean;
}) {
  const { branch } = stats;
  const badge = ROLE_BADGE[branch.role] ?? { label: branch.role, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border bg-white p-5 cursor-pointer transition-all hover:shadow-md ${
        isActive ? 'border-[#ec5b13] ring-2 ring-[#ec5b13]/20' : 'border-slate-200'
      }`}
    >
      {isActive && (
        <CheckCircle2 size={18} className="absolute top-4 right-4 text-[#ec5b13]" />
      )}
      <div className="flex items-start gap-3 mb-4">
        <div className="size-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Building2 size={22} className="text-[#ec5b13]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-slate-900 text-base leading-tight truncate">{branch.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">/{branch.slug}</p>
        </div>
      </div>

      {(branch.phone || branch.address) && (
        <div className="flex flex-col gap-1 mb-4 text-xs text-slate-500">
          {branch.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={11} /> {branch.phone}
            </span>
          )}
          {branch.address && (
            <span className="flex items-center gap-1.5">
              <MapPin size={11} /> {branch.address}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
        <StatPill icon={Users} value={`${stats.active_students} / ${stats.total_students}`} label="O'quvchilar" accent="#6366f1" />
        <StatPill icon={GraduationCap} value={String(stats.total_teachers)} label="O'qituvchilar" accent="#10b981" />
        <StatPill icon={Layers} value={String(stats.total_groups)} label="Guruhlar" accent="#f59e0b" />
        <StatPill icon={Wallet} value={`${(stats.total_revenue / 1_000_000).toFixed(1)}M`} label="Tushum" accent="#ec5b13" />
      </div>

      {stats.total_debt > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5">
          <AlertTriangle size={12} />
          <span>Qarzdorlik: {stats.total_debt.toLocaleString()} UZS</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end text-xs font-bold text-[#ec5b13]">
        <span>Tanlash</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

function CreateBranchModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (val: string) =>
    val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(autoSlug(v));
  };

  const submit = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Nom va slug majburiy');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/branches/', { name, slug, phone: phone || null, address: address || null });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-black text-slate-900 mb-5">Yangi filial yaratish</h2>

        {error && (
          <div className="mb-4 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Filial nomi *', value: name, onChange: handleNameChange, placeholder: 'Masalan: Chilonzor filiali' },
            { label: 'Slug *', value: slug, onChange: setSlug, placeholder: 'chilonzor-filiali' },
            { label: 'Telefon', value: phone, onChange: setPhone, placeholder: '+998 90 123 45 67' },
            { label: 'Manzil', value: address, onChange: setAddress, placeholder: 'Toshkent, Chilonzor tumani' },
          ].map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#ec5b13] text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Yaratish
          </button>
        </div>
      </div>
    </div>
  );
}

export const Branches = () => {
  const { branches, activeBranch, setActiveBranch } = useBranch();
  const [allStats, setAllStats] = useState<BranchStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchStats = useCallback(async () => {
    if (branches.length === 0) return;
    setLoadingStats(true);
    try {
      const results = await Promise.allSettled(
        branches.map((b) => api.get(`/branches/${b.id}/stats`))
      );
      const stats = results
        .map((r, i) => {
          if (r.status === 'fulfilled') {
            const d = r.value.data?.data ?? r.value.data;
            return d as BranchStats;
          }
          return {
            branch: branches[i],
            total_students: 0,
            active_students: 0,
            total_teachers: 0,
            total_groups: 0,
            total_revenue: 0,
            total_debt: 0,
          } as BranchStats;
        });
      setAllStats(stats);
    } finally {
      setLoadingStats(false);
    }
  }, [branches]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalRevenue = allStats.reduce((s, x) => s + x.total_revenue, 0);
  const totalStudents = allStats.reduce((s, x) => s + x.total_students, 0);
  const totalDebt = allStats.reduce((s, x) => s + x.total_debt, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50/60">
      <Header title="Filiallar" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">

        {/* Summary bar */}
        {allStats.length > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Jami o'quvchilar", value: totalStudents.toLocaleString(), icon: Users, accent: '#6366f1' },
              { label: 'Jami tushum', value: `${(totalRevenue / 1_000_000).toFixed(1)}M UZS`, icon: Wallet, accent: '#ec5b13' },
              { label: 'Jami qarzdorlik', value: `${(totalDebt / 1_000_000).toFixed(1)}M UZS`, icon: AlertTriangle, accent: '#ef4444' },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                  <Icon size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-base font-black text-slate-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Barcha filiallar</h2>
            <p className="text-sm text-slate-500 mt-0.5">{branches.length} ta filial</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Yangi filial
          </button>
        </div>

        {/* Branch grid */}
        {loadingStats ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span>Yuklanmoqda...</span>
          </div>
        ) : allStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Globe size={40} />
            <p className="font-bold">Filiallar topilmadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {allStats.map((s) => (
              <BranchCard
                key={s.branch.id}
                stats={s}
                isActive={activeBranch?.id === s.branch.id}
                onSelect={() => setActiveBranch(s.branch)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateBranchModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};
