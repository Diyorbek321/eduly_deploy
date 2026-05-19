import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2, Search, Clock, Layers } from 'lucide-react';
import api from '../lib/api';

interface Course {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  status: string;
  groups_count?: number;
  modules_count?: number;
  description?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'Faol': 'bg-emerald-50 text-emerald-600',
  'Nofaol': 'bg-slate-100 text-slate-500',
  'active': 'bg-emerald-50 text-emerald-600',
  'inactive': 'bg-slate-100 text-slate-500',
};

const fmt = (n: number) => n.toLocaleString();

export const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/courses');
        const data: Course[] = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        // Fetch modules count for each course
        const withModules = await Promise.all(
          data.map(async (c) => {
            try {
              const mRes = await api.get('/modules', { params: { course_id: c.id } });
              const modules = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.items ?? []);
              return { ...c, modules_count: modules.length };
            } catch {
              return { ...c, modules_count: 0 };
            }
          })
        );
        setCourses(withModules);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
          <BookOpen size={20} className="text-rose-500" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Kurslar</h1>
          <p className="text-sm text-slate-400">{courses.length} ta kurs</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Kurs nomi bo'yicha qidiring..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-900"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              Kurs topilmadi
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="size-11 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-rose-500" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {c.status}
                </span>
              </div>
              <h3 className="font-black text-slate-900">{c.name}</h3>
              {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-0.5">
                    <Clock size={10} /> Davomiyligi
                  </p>
                  <p className="text-sm font-black text-slate-900">{c.duration_months}<span className="text-xs font-normal text-slate-400">oy</span></p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-0.5">
                    <Layers size={10} /> Guruhlar
                  </p>
                  <p className="text-sm font-black text-slate-900">{c.groups_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Modullar</p>
                  <p className="text-sm font-black text-slate-900">{c.modules_count ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">Narxi</p>
                <p className="font-black text-[#ec5b13]">{fmt(c.price)} <span className="text-xs font-normal text-slate-400">UZS/oy</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
