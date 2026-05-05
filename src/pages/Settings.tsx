import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Building2,
  Smartphone,
  Mail,
  Lock,
  LogOut,
  Save,
  MapPin,
  Clock,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSettings } from '@/src/contexts/SettingsContext';
import api from '@/src/lib/api';

interface ProfileData {
  id: number;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
}

interface CenterSettings {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  working_hours: string | null;
  timezone: string;
  language: string;
}

type Tab = 'profile' | 'security' | 'center';

export const Settings = () => {
  const { logout, user } = useAuth();
  const { setCenter: setCenterCtx } = useSettings();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('profile');

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [center, setCenter] = useState<CenterSettings | null>(null);
  const [profileDraft, setProfileDraft] = useState({ name: '', phone: '', avatar: '' });
  const [centerDraft, setCenterDraft] = useState<Partial<CenterSettings>>({});
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c] = await Promise.all([
          api.get('/settings/profile'),
          isAdmin ? api.get('/settings') : Promise.resolve(null),
        ]);
        setProfile(p.data);
        setProfileDraft({
          name: p.data.name ?? '',
          phone: p.data.phone ?? '',
          avatar: p.data.avatar ?? '',
        });
        if (c) {
          setCenter(c.data);
          setCenterDraft(c.data);
        }
      } catch {
        flash('error', "Ma'lumotlarni yuklab bo'lmadi");
      }
    };
    load();
  }, [isAdmin]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/profile', profileDraft);
      setProfile(res.data);
      flash('ok', 'Profil saqlandi');
    } catch {
      flash('error', 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const saveCenter = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', centerDraft);
      setCenter(res.data);
      setCenterCtx(res.data);
      flash('ok', 'Markaz sozlamalari saqlandi');
    } catch {
      flash('error', 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new_password !== passwords.confirm) {
      flash('error', 'Yangi parollar mos emas');
      return;
    }
    if (passwords.new_password.length < 6) {
      flash('error', 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      setPasswords({ old_password: '', new_password: '', confirm: '' });
      flash('ok', 'Parol yangilandi');
    } catch {
      flash('error', "Parolni o'zgartirib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const navItems: { id: Tab; icon: typeof User; label: string; adminOnly?: boolean }[] = [
    { id: 'profile', icon: User, label: "Profil ma'lumotlari" },
    { id: 'security', icon: Shield, label: 'Xavfsizlik' },
    { id: 'center', icon: Building2, label: 'Markaz sozlamalari', adminOnly: true },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1000px] mx-auto w-full">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Sozlamalar</h2>
            <p className="text-sm text-slate-500 mt-1">Profil va tizim parametrlarini boshqarish</p>
          </div>
          {message && (
            <div
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold',
                message.kind === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              )}
            >
              {message.text}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-2">
            {navItems
              .filter((i) => !i.adminOnly || isAdmin)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all',
                    tab === item.id
                      ? 'bg-white text-[#ec5b13] shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all"
              >
                <LogOut size={20} />
                <span>Tizimdan chiqish</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-2 space-y-8">
            {tab === 'profile' && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="size-24 rounded-3xl bg-slate-100 overflow-hidden border-4 border-slate-50 flex items-center justify-center text-slate-400 text-2xl font-black">
                    {profileDraft.avatar ? (
                      <img src={profileDraft.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (profileDraft.name || profile?.email || '?').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{profileDraft.name || '—'}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {profile?.email} • {profile?.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Ism sharifi</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={profileDraft.name}
                        onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Email manzili</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="email"
                        value={profile?.email ?? ''}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl outline-none font-bold text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Telefon raqami</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={profileDraft.phone}
                        onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+998 XX XXX XX XX"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Avatar URL</label>
                    <input
                      type="text"
                      value={profileDraft.avatar}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, avatar: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#ec5b13] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                  >
                    <Save size={16} />
                    O'zgarishlarni saqlash
                  </button>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Lock size={20} className="text-[#ec5b13]" /> Parolni o'zgartirish
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Joriy parol</label>
                    <input
                      type="password"
                      value={passwords.old_password}
                      onChange={(e) => setPasswords((p) => ({ ...p, old_password: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase">Yangi parol</label>
                      <input
                        type="password"
                        value={passwords.new_password}
                        onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase">Tasdiqlash</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={changePassword}
                    disabled={saving || !passwords.old_password || !passwords.new_password}
                    className="px-6 py-3 bg-[#ec5b13] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                  >
                    Parolni yangilash
                  </button>
                </div>
              </div>
            )}

            {tab === 'center' && isAdmin && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 size={20} className="text-[#ec5b13]" /> Markaz sozlamalari
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase">Markaz nomi</label>
                    <input
                      type="text"
                      value={centerDraft.name ?? ''}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase">Manzil</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={centerDraft.address ?? ''}
                        onChange={(e) => setCenterDraft((c) => ({ ...c, address: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Telefon</label>
                    <input
                      type="text"
                      value={centerDraft.phone ?? ''}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Email</label>
                    <input
                      type="email"
                      value={centerDraft.email ?? ''}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Ish vaqti</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={centerDraft.working_hours ?? ''}
                        onChange={(e) => setCenterDraft((c) => ({ ...c, working_hours: e.target.value }))}
                        placeholder="09:00 - 20:00"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Logo URL</label>
                    <input
                      type="text"
                      value={centerDraft.logo ?? ''}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, logo: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Vaqt zonasi</label>
                    <input
                      type="text"
                      value={centerDraft.timezone ?? ''}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, timezone: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase">Til</label>
                    <select
                      value={centerDraft.language ?? 'uz'}
                      onChange={(e) => setCenterDraft((c) => ({ ...c, language: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
                    >
                      <option value="uz">O'zbekcha</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={saveCenter}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#ec5b13] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                  >
                    <Save size={16} />
                    Saqlash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
