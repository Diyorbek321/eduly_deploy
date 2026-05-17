import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Gift,
  Coins,
  ShoppingBag,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { Modal } from '@/src/components/Modal';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';

interface Reward {
  id: number;
  name: string;
  cost: number;
  stock: number;
  image: string | null;
  is_active: boolean;
}

interface Purchase {
  id: number;
  student_id: number;
  student_name: string | null;
  reward_id: number;
  reward_name: string | null;
  cost: number;
  status: string;
  created_at: string;
}

interface Wallet {
  student_id: number;
  student_name: string | null;
  coins: number;
}

type Tab = 'Mukofotlar' | 'Xaridlar' | 'Hamyonlar';

const emptyForm = { name: '', cost: 0, stock: 0, image: '' };

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const Gamification = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('Mukofotlar');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [walletSearch, setWalletSearch] = useState('');
  const [grantStudent, setGrantStudent] = useState<Wallet | null>(null);
  const [grantAmount, setGrantAmount] = useState(0);
  const [pulsedWallets, setPulsedWallets] = useState<Set<number>>(new Set());
  const [streamLive, setStreamLive] = useState(false);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadRewards = async () => {
    try {
      const res = await api.get('/rewards');
      setRewards(res.data);
    } catch {
      flash('error', "Mukofotlarni yuklab bo'lmadi");
    }
  };

  const loadPurchases = async () => {
    try {
      const res = await api.get('/rewards/purchases', { params: { limit: 200 } });
      setPurchases(res.data);
    } catch {
      flash('error', "Xaridlarni yuklab bo'lmadi");
    }
  };

  const loadWallets = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/rewards/wallets');
      setWallets(res.data);
    } catch {
      flash('error', "Hamyonlarni yuklab bo'lmadi");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadRewards(), loadPurchases(), loadWallets()]).finally(() =>
      setLoading(false)
    );

  }, []);

  // ─── Real-time wallet stream ──────────────────────────────────────────────
  // Subscribes to /rewards/stream (SSE) and refreshes the wallets list when
  // a wallet.updated / purchase.* event lands. Keeps the "Hamyonlar" tab in
  // sync with homework coin awards and reward purchases without polling.
  useEffect(() => {
    if (!isAdmin) return;
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) return;
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');
    const url = `${apiBase}/rewards/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: true });

    const refreshWallets = () => { void loadWallets(); };
    const refreshPurchases = () => { void loadPurchases(); };

    es.addEventListener('hello', () => setStreamLive(true));

    es.addEventListener('wallet.updated', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data || '{}');
        const sid = Number(data.student_id);
        if (sid) {
          setPulsedWallets((prev) => new Set(prev).add(sid));
          setTimeout(() => {
            setPulsedWallets((prev) => {
              const next = new Set(prev);
              next.delete(sid);
              return next;
            });
          }, 1800);
        }
      } catch { /* ignore */ }
      refreshWallets();
    });
    es.addEventListener('purchase.created', () => { refreshWallets(); refreshPurchases(); });
    es.addEventListener('purchase.updated', refreshPurchases);
    es.addEventListener('reward.created', () => void loadRewards());
    es.addEventListener('reward.updated', () => void loadRewards());
    es.addEventListener('reward.deleted', () => void loadRewards());

    es.onerror = () => {
      setStreamLive(false);
      // Browser auto-reconnects on transient errors; nothing else to do.
    };

    return () => { es.close(); setStreamLive(false); };
  }, [isAdmin]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAddClick = () => {
    setEditingReward(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEditClick = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      cost: reward.cost,
      stock: reward.stock,
      image: reward.image ?? '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (reward: Reward) => {
    if (!confirm("Haqiqatan ham bu mukofotni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/rewards/${reward.id}`);
      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
      flash('ok', "Mukofot o'chirildi");
    } catch {
      flash('error', "O'chirishda xatolik");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      flash('error', 'Nom bo\'sh bo\'lmasligi kerak');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        cost: Number(formData.cost) || 0,
        stock: Number(formData.stock) || 0,
        image: formData.image || null,
      };
      if (editingReward) {
        const res = await api.put(`/rewards/${editingReward.id}`, payload);
        setRewards((prev) => prev.map((r) => (r.id === editingReward.id ? res.data : r)));
        flash('ok', 'Mukofot yangilandi');
      } else {
        const res = await api.post('/rewards', payload);
        setRewards((prev) => [res.data, ...prev]);
        flash('ok', "Mukofot qo'shildi");
      }
      setIsModalOpen(false);
    } catch {
      flash('error', 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleGrantCoins = async () => {
    if (!grantStudent || !grantAmount) return;
    try {
      const res = await api.post(`/rewards/wallets/${grantStudent.student_id}/adjust`, {
        amount: grantAmount,
      });
      setWallets((prev) =>
        prev.map((w) => (w.student_id === res.data.student_id ? res.data : w))
      );
      flash('ok', `${grantStudent.student_name}: ${grantAmount > 0 ? '+' : ''}${grantAmount}`);
      setGrantStudent(null);
      setGrantAmount(0);
    } catch (err: any) {
      flash('error', err?.response?.data?.detail || "O'zgartirib bo'lmadi");
    }
  };

  const filteredWallets = useMemo(() => {
    const q = walletSearch.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter((w) => (w.student_name || '').toLowerCase().includes(q));
  }, [wallets, walletSearch]);

  const filteredPurchases = useMemo(() => {
    const q = walletSearch.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        (p.student_name || '').toLowerCase().includes(q) ||
        (p.reward_name || '').toLowerCase().includes(q)
    );
  }, [purchases, walletSearch]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Gamifikatsiya</h2>
            <p className="text-sm text-slate-500 mt-1">
              O'quvchilar uchun tangalar va mukofotlar tizimi
            </p>
          </div>
          <div className="flex items-center gap-3">
            {message && (
              <div
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold',
                  message.kind === 'ok'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                )}
              >
                {message.text}
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {(['Mukofotlar', 'Xaridlar', 'Hamyonlar'] as Tab[])
                .filter((t) => t !== 'Hamyonlar' || isAdmin)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      'px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
                      activeTab === t
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {t === 'Xaridlar' ? 'Xaridlar tarixi' : t}
                  </button>
                ))}
            </div>
            {activeTab === 'Mukofotlar' && isAdmin && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
              >
                <Plus size={18} />
                <span>Mukofot qo'shish</span>
              </button>
            )}
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Yuklanmoqda…</p>}

        {activeTab === 'Mukofotlar' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rewards.length === 0 && !loading && (
              <p className="text-sm text-slate-500 col-span-full">Hozircha mukofotlar yo'q.</p>
            )}
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all group flex flex-col"
              >
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {reward.image ? (
                    <img
                      src={reward.image}
                      alt={reward.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={40} />
                    </div>
                  )}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(reward)}
                        className="p-2 bg-white/90 backdrop-blur-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(reward)}
                        className="p-2 bg-white/90 backdrop-blur-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2">
                    {reward.name}
                  </h3>
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Narxi
                      </span>
                      <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg">
                        <Coins size={16} />
                        <span className="font-black">{reward.cost} tanga</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Qoldiq
                      </span>
                      <span className="text-sm font-black text-slate-900">{reward.stock} ta</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Xaridlar' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">O'quvchilar xaridlari</h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Tangalar evaziga olingan mukofotlar tarixi
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="Qidirish..."
                  className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 text-sm outline-none transition-all"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredPurchases.length === 0 && (
                <div className="p-6 text-sm text-slate-500">Xaridlar yo'q.</div>
              )}
              {filteredPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                      {(purchase.student_name || '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {purchase.student_name || `#${purchase.student_id}`}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(purchase.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {purchase.reward_name || `#${purchase.reward_id}`}
                      </p>
                      <div className="flex items-center gap-1 text-amber-500 justify-end mt-0.5">
                        <Coins size={12} />
                        <span className="text-xs font-black">-{purchase.cost} tanga</span>
                      </div>
                    </div>
                    {isAdmin && purchase.status === 'Kutilmoqda' ? (
                      <button
                        onClick={async () => {
                          try {
                            await api.put(`/rewards/purchases/${purchase.id}/status`, null, {
                              params: { new_status: 'Topshirildi' },
                            });
                            await refreshPurchases();
                          } catch { /* interceptor handles */ }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all whitespace-nowrap"
                      >
                        Topshirildi ✓
                      </button>
                    ) : (
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap",
                        purchase.status === 'Topshirildi'
                          ? "bg-emerald-100 text-emerald-700"
                          : purchase.status === 'Bekor qilingan'
                          ? "bg-red-100 text-red-600"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {purchase.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Hamyonlar' && isAdmin && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <WalletIcon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">O'quvchilar hamyonlari</h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1',
                        streamLive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}
                      title={streamLive ? 'Real-time ulangan' : 'Ulanmagan'}
                    >
                      <span
                        className={cn(
                          'inline-block size-1.5 rounded-full',
                          streamLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                        )}
                      />
                      {streamLive ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    Tanga balanslari — uy vazifasi tekshirilganda avtomatik yangilanadi
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="O'quvchi qidirish..."
                  className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 text-sm outline-none transition-all"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredWallets.length === 0 && (
                <div className="p-6 text-sm text-slate-500">O'quvchilar topilmadi.</div>
              )}
              {filteredWallets.map((w) => (
                <button
                  key={w.student_id}
                  onClick={() => {
                    setGrantStudent(w);
                    setGrantAmount(0);
                  }}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                      {(w.student_name || '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {w.student_name || `#${w.student_id}`}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-500',
                      pulsedWallets.has(w.student_id)
                        ? 'text-green-700 bg-green-100 ring-2 ring-green-300 scale-110'
                        : 'text-amber-500 bg-amber-50'
                    )}
                  >
                    <Coins size={16} />
                    <span className="font-black">{w.coins} tanga</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Reward Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReward ? 'Mukofotni tahrirlash' : "Yangi mukofot qo'shish"}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-[#ec5b13] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              Saqlash
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer w-full h-48 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center hover:border-orange-300 hover:bg-orange-50/50 transition-all">
              {formData.image ? (
                <img src={formData.image} alt="Reward" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon size={32} className="text-slate-300 mb-2" />
                  <span className="text-xs font-bold text-slate-400">Rasm yuklash</span>
                </>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-sm font-bold">Rasmni o'zgartirish</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Mukofot nomi</label>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: Brendlangan daftar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Narxi (Tanga)</label>
              <div className="relative">
                <Coins
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="number"
                  value={formData.cost || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cost: Number(e.target.value) }))
                  }
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                  placeholder="50"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Soni (Qoldiq)</label>
              <div className="relative">
                <ShoppingBag
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))
                  }
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                  placeholder="100"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Grant Coins Modal */}
      <Modal
        isOpen={!!grantStudent}
        onClose={() => setGrantStudent(null)}
        title={grantStudent ? `${grantStudent.student_name}: hamyonni sozlash` : ''}
        footer={
          <>
            <button
              onClick={() => setGrantStudent(null)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleGrantCoins}
              disabled={!grantAmount}
              className="flex-1 py-3 bg-[#ec5b13] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              Saqlash
            </button>
          </>
        }
      >
        {grantStudent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-amber-50 px-4 py-3 rounded-xl">
              <span className="text-sm font-bold text-slate-600">Joriy balans</span>
              <div className="flex items-center gap-1.5 text-amber-600">
                <Coins size={16} />
                <span className="font-black">{grantStudent.coins} tanga</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">
                Qo'shish (+) yoki kamaytirish (-)
              </label>
              <input
                type="number"
                value={grantAmount || ''}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="+100 yoki -50"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
