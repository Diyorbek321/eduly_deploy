import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Wallet, BookOpen, Calendar, Clock, GraduationCap, RefreshCw, Save, Lock } from 'lucide-react';
import { api } from '../lib/api';

interface Stats {
  teacher_id: number;
  teacher_name: string;
  specialty: string | null;
  hourly_rate: number;
  groups_count: number;
  total_students: number;
  groups: Array<{ id: number; name: string; students_count: number }>;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  experience: string | null;
  birth_date: string | null;
  bio: string | null;
  rating: number;
}

interface Salary {
  id: number;
  month: string;
  base_amount: number;
  bonus: number;
  total_hours: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
}

export function TeacherProfile() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', experience: '', bio: '', birth_date: '' });

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, sals] = await Promise.all([
        api.get<Stats>('/teacher/stats'),
        api.get<Salary[]>('/teacher/my-salaries').catch(() => ({ data: [] as Salary[] })),
      ]);
      setStats(s.data);
      setSalaries(sals.data);
      setForm({
        phone: s.data.phone || '',
        experience: s.data.experience || '',
        bio: s.data.bio || '',
        birth_date: s.data.birth_date || '',
      });
    } catch (err: any) {
      setError(err.message || 'Profil yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.birth_date) delete payload.birth_date;
      const res = await api.put<Stats>('/teacher/profile', payload);
      setStats(res.data);
      setEditing(false);
      alert('✅ Profil yangilandi!');
    } catch (err: any) {
      alert(err.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdNew.length < 6) {
      alert("Yangi parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    try {
      await api.put('/teacher/profile/password', { old_password: pwdOld, new_password: pwdNew });
      alert("✅ Parol o'zgartirildi!");
      setPwdOpen(false); setPwdOld(''); setPwdNew('');
    } catch (err: any) {
      alert(err.message || 'Xatolik');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20 text-slate-400">
        <User size={48} className="mx-auto mb-4 opacity-20" />
        <p className="font-bold">{error || "O'qituvchi profili topilmadi"}</p>
        <button onClick={fetchProfile} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthSalary = salaries.find((s) => s.month === thisMonthKey);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mening profilim</h1>
          <p className="text-gray-500 mt-1">Shaxsiy ma'lumotlar va statistika</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPwdOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Lock size={16} />Parolni o'zgartirish
          </button>
          <button onClick={fetchProfile} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} />Yangilash
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-[#ec5b13]"></div>
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <div className="size-32 rounded-3xl bg-white p-1.5 shadow-xl flex-shrink-0">
              {stats.avatar ? (
                <img src={stats.avatar} alt={stats.teacher_name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <div className="w-full h-full rounded-2xl bg-orange-100 flex items-center justify-center">
                  <span className="text-5xl font-black text-[#ec5b13]">{stats.teacher_name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-black text-gray-900">{stats.teacher_name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="px-3 py-1 bg-orange-100 text-[#ec5b13] text-sm font-bold rounded-lg">O'qituvchi</span>
                {stats.specialty && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg">{stats.specialty}</span>
                )}
                {stats.rating > 0 && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 text-sm font-bold rounded-lg">⭐ {stats.rating.toFixed(1)}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing((e) => !e)}
              className="px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600"
            >
              {editing ? 'Bekor qilish' : 'Tahrirlash'}
            </button>
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
              <InfoRow icon={Mail} label="Email" value={stats.email || '—'} />
              <InfoRow icon={Phone} label="Telefon" value={stats.phone || 'Kiritilmagan'} />
              <InfoRow icon={GraduationCap} label="Mutaxassislik" value={stats.specialty || '—'} />
              <InfoRow icon={Calendar} label="Tajriba" value={stats.experience || '—'} />
              {stats.bio && (
                <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Bio</p>
                  <p className="text-sm text-gray-700">{stats.bio}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
              <FormField label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <FormField label="Tajriba" value={form.experience} onChange={(v) => setForm({ ...form, experience: v })} />
              <FormField label="Tug'ilgan sana (YYYY-MM-DD)" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} placeholder="1990-01-15" />
              <div className="md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <button onClick={handleSave} disabled={saving}
                  className="w-full py-3 bg-[#ec5b13] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save size={16} />{saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} color="bg-blue-50 text-blue-600" label="Guruhlar" value={stats.groups_count} />
        <StatCard icon={User} color="bg-emerald-50 text-emerald-600" label="O'quvchilar" value={stats.total_students} />
        <StatCard icon={Clock} color="bg-purple-50 text-purple-600" label="Soatlik stavka" value={`${stats.hourly_rate.toLocaleString()} so'm`} />
        <StatCard icon={Wallet} color="bg-orange-50 text-[#ec5b13]" label="Bu oylik maosh"
          value={thisMonthSalary ? `${thisMonthSalary.total_amount.toLocaleString()} so'm` : '—'} />
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-gray-900 mb-4">Maosh tarixi</h3>
        {salaries.length === 0 ? (
          <p className="text-center py-8 text-slate-400">Maosh ma'lumotlari hali yo'q</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {salaries.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold text-slate-900">{s.month}</p>
                  <p className="text-xs text-slate-500">{s.total_hours} soat • Bonus: {s.bonus.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{s.total_amount.toLocaleString()} so'm</p>
                  <span className={`text-xs font-bold ${s.is_paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {s.is_paid ? "To'langan" : 'Kutilmoqda'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pwdOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPwdOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-4">Parolni o'zgartirish</h3>
            <div className="space-y-3">
              <input type="password" placeholder="Joriy parol" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)}
                className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-medium text-sm" />
              <input type="password" placeholder="Yangi parol (kamida 6 ta)" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)}
                className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-medium text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setPwdOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-sm">Bekor qilish</button>
                <button onClick={handleChangePassword} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-xl font-bold text-sm">Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-black text-slate-400 uppercase mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-orange-500/20" />
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className={`size-14 rounded-2xl ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7" />
      </div>
      <p className="text-sm text-gray-500 font-bold mb-1">{label}</p>
      <h3 className="text-xl font-black text-gray-900">{value}</h3>
    </div>
  );
}
