import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';
import { User, Mail, Phone, Wallet, BookOpen, Calendar, Clock, GraduationCap, RefreshCw } from 'lucide-react';
import { Header } from '@/src/components/Header';

interface DashboardStats {
  teacher_id: number;
  teacher_name: string;
  specialty: string | null;
  hourly_rate: number;
  groups_count: number;
  total_students: number;
  groups: Array<{ id: number; name: string }>;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  experience: string | null;
  birth_date: string | null;
  bio: string | null;
  rating: number;
}

export function MyProfile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const statsRes = await api.get('/teacher/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setLoadError(typeof detail === 'string' ? detail : "Profilni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="text-center py-20 text-slate-400">
          <User size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">{loadError || "O'qituvchi profili topilmadi"}</p>
          <p className="text-sm mt-1">Admin siz uchun o'qituvchi profili yaratishi kerak</p>
          <button
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl text-sm font-bold"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mening profilim</h1>
          <p className="text-gray-500 mt-1">Shaxsiy ma'lumotlar va statistika</p>
        </div>
        <button onClick={fetchProfile} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} /> Yangilash
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-[#ec5b13]"></div>
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <div className="size-32 rounded-3xl bg-white p-1.5 shadow-xl flex-shrink-0">
              <div className="w-full h-full rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden">
                {stats.avatar ? (
                  <img src={stats.avatar} alt={stats.teacher_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-black text-[#ec5b13]">{stats.teacher_name.charAt(0)}</span>
                )}
              </div>
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-black text-gray-900">{stats.teacher_name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="px-3 py-1 bg-orange-100 text-[#ec5b13] text-sm font-bold rounded-lg">O'qituvchi</span>
                {stats.specialty && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg">{stats.specialty}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-gray-400" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email</p>
                <p className="font-bold text-gray-900 truncate">{stats.email || user?.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Phone className="w-5 h-5 text-gray-400" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Telefon</p>
                <p className="font-bold text-gray-900 truncate">{stats.phone || '—'}</p>
              </div>
            </div>
            {stats.specialty && (
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-5 h-5 text-gray-400" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Mutaxassislik</p>
                  <p className="font-bold text-gray-900 truncate">{stats.specialty}</p>
                </div>
              </div>
            )}
            {stats.experience && (
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-gray-400" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tajriba</p>
                  <p className="font-bold text-gray-900 truncate">{stats.experience}</p>
                </div>
              </div>
            )}
            {stats.birth_date && (
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-gray-400" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tug'ilgan sana</p>
                  <p className="font-bold text-gray-900 truncate">{stats.birth_date}</p>
                </div>
              </div>
            )}
          </div>
          {stats.bio && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Bio</p>
              <p className="text-slate-700 text-sm leading-relaxed">{stats.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="size-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4"><BookOpen className="w-7 h-7 text-blue-600" /></div>
          <p className="text-sm text-gray-500 font-bold mb-1">Jami o'quvchilar</p>
          <h3 className="text-2xl font-black text-gray-900">{stats.total_students} ta</h3>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="size-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4"><Calendar className="w-7 h-7 text-purple-600" /></div>
          <p className="text-sm text-gray-500 font-bold mb-1">Guruhlar</p>
          <h3 className="text-2xl font-black text-gray-900">{stats.groups_count} ta</h3>
        </div>
      </div>

      {/* Groups */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-gray-900 mb-4">Mening guruhlarim</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.groups.map((g) => (
            <div key={g.id} className="text-center p-4 bg-slate-50 rounded-2xl">
              <p className="font-bold text-[#ec5b13] truncate">{g.name}</p>
            </div>
          ))}
          {stats.groups.length === 0 && <p className="text-slate-400 col-span-4">Guruhlar topilmadi</p>}
        </div>
      </div>
      </main>
    </div>
  );
}
