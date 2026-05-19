import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Loader2, Layers, Users, Brain,
  ChevronUp, ChevronDown, Edit3, Zap, BarChart2,
  RefreshCw, CheckCircle2,
} from 'lucide-react';

import api from '../lib/api';

interface Course { id: number; name: string }

interface CourseModule {
  id: number;
  course_id: number;
  course_name: string;
  name: string;
  level_order: number;
  description: string | null;
  ai_prompt_hint: string | null;
  student_count: number;
  quest_count: number;
}

interface QuestStat {
  quest_id: number;
  module_id: number;
  module_name: string;
  course_name: string;
  date: string;
  question_count: number;
  enrolled_students: number;
  total_attempts: number;
  passed: number;
  pass_rate: number;
  completion_rate: number;
}

// ─── Module Form Modal ────────────────────────────────────────────────────────

function ModuleModal({
  courses,
  module,
  onClose,
  onSaved,
}: {
  courses: Course[];
  module: CourseModule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!module;
  const [courseId, setCourseId] = useState(module ? String(module.course_id) : '');
  const [name, setName] = useState(module?.name ?? '');
  const [levelOrder, setLevelOrder] = useState(module?.level_order ?? 1);
  const [description, setDescription] = useState(module?.description ?? '');
  const [hint, setHint] = useState(module?.ai_prompt_hint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!courseId || !name.trim()) { setError("Kurs va nom majburiy"); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.patch(`/modules/${module!.id}`, {
          name, level_order: levelOrder,
          description: description || null,
          ai_prompt_hint: hint || null,
        });
      } else {
        await api.post('/modules/', {
          course_id: Number(courseId), name, level_order: levelOrder,
          description: description || null,
          ai_prompt_hint: hint || null,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">{isEdit ? 'Modulni tahrirlash' : 'Yangi modul'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}

          {!isEdit && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Kurs *</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                <option value="">— Tanlang —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Modul nomi *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Masalan: Beginner, Pre-Intermediate"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
            <p className="text-[11px] text-slate-400 mt-1">Guruhning "Daraja" maydoni bilan mos bo'lishi kerak (avtomatik biriktirish uchun)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tartib raqami (daraja)</label>
            <input type="number" min={1} value={levelOrder} onChange={e => setLevelOrder(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tavsif</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">AI uchun qo'shimcha ko'rsatma</label>
            <textarea rows={2} value={hint} onChange={e => setHint(e.target.value)}
              placeholder="Masalan: Focus on vocabulary, grammar topics: present simple, past simple"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
            <p className="text-[11px] text-slate-400 mt-1">AI savol yaratishda ushbu ko'rsatmani hisobga oladi</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Bekor
          </button>
          <button type="button" onClick={submit} disabled={saving}
            className="flex-1 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module, onEdit, onDelete, onGenerate,
}: {
  module: CourseModule;
  onEdit: () => void;
  onDelete: () => void;
  onGenerate: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate();
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">#{module.level_order}</span>
            <h3 className="font-black text-slate-900">{module.name}</h3>
          </div>
          <p className="text-xs text-slate-500">{module.course_name}</p>
          {module.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{module.description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <Edit3 size={14} />
          </button>
          <button type="button" onClick={onDelete} className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <Users size={12} className="text-violet-500" /> {module.student_count} o'quvchi
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <Brain size={12} className="text-[#ec5b13]" /> {module.quest_count} quest
        </span>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl transition-colors ${
            generated
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
          }`}
        >
          {generating ? <Loader2 size={11} className="animate-spin" /> : generated ? <CheckCircle2 size={11} /> : <Zap size={11} />}
          {generating ? 'Yaratilmoqda...' : generated ? 'Yaratildi!' : "Bugun quest yaratish"}
        </button>
      </div>

      {module.ai_prompt_hint && (
        <div className="mt-3 text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 line-clamp-1">
          💡 {module.ai_prompt_hint}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const CourseModules = () => {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<QuestStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CourseModule | null>(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [activeTab, setActiveTab] = useState<'modules' | 'quests'>('modules');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [modRes, courseRes, statsRes] = await Promise.all([
        api.get('/modules/'),
        api.get('/courses'),
        api.get('/daily-quests/admin/stats'),
      ]);
      const mList = Array.isArray(modRes.data) ? modRes.data : (modRes.data?.data ?? []);
      const cList = Array.isArray(courseRes.data) ? courseRes.data : (courseRes.data?.data ?? []);
      const sList = statsRes.data?.quests ?? statsRes.data?.data?.quests ?? [];
      setModules(mList);
      setCourses(cList.map((c: any) => ({ id: Number(c.id), name: c.name })));
      setStats(Array.isArray(sList) ? sList : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteModule = async (m: CourseModule) => {
    if (!confirm(`"${m.name}" modulini o'chirilsinmi?`)) return;
    await api.delete(`/modules/${m.id}`);
    fetchAll();
  };

  const generateQuest = async (m: CourseModule) => {
    await api.post(`/modules/${m.id}/generate-quest`);
    fetchAll();
  };

  const filtered = filterCourse
    ? modules.filter(m => String(m.course_id) === filterCourse)
    : modules;

  const grouped = filtered.reduce<Record<string, CourseModule[]>>((acc, m) => {
    if (!acc[m.course_name]) acc[m.course_name] = [];
    acc[m.course_name].push(m);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto w-full">

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {(['modules', 'quests'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? 'bg-[#ec5b13] text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {tab === 'modules' ? 'Modullar' : "Bugungi Questlar"}
            </button>
          ))}
        </div>

        {activeTab === 'modules' ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500/20">
                <option value="">Barcha kurslar</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => { setEditTarget(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600">
                <Plus size={16} /> Yangi modul
              </button>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-2xl p-4 text-sm">
              <Layers size={18} className="text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Avtomatik biriktirish</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Guruhning <strong>Daraja</strong> maydoni (masalan "Beginner") modul nomiga mos kelsa, o'quvchi o'sha modulga avtomatik biriktiriladi.
                  Har kuni 00:00 da AI har bir modul uchun 10 ta savol yaratadi.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                <Layers size={40} />
                <p className="font-bold">Modullar yo'q</p>
                <button type="button" onClick={() => { setEditTarget(null); setShowModal(true); }}
                  className="text-sm text-[#ec5b13] font-bold hover:underline">Birinchi modulni yarating</button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([courseName, mods]) => (
                  <div key={courseName}>
                    <h3 className="text-sm font-black text-slate-600 mb-3 flex items-center gap-2">
                      <BookOpen size={14} className="text-[#ec5b13]" /> {courseName}
                      <span className="text-slate-400 font-normal">({mods.length} modul)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {mods.sort((a, b) => a.level_order - b.level_order).map(m => (
                        <ModuleCard
                          key={m.id}
                          module={m}
                          onEdit={() => { setEditTarget(m); setShowModal(true); }}
                          onDelete={() => deleteModule(m)}
                          onGenerate={() => generateQuest(m)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Quests stats tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Bugungi AI questlar</h2>
              <button type="button" onClick={fetchAll} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50">
                <RefreshCw size={12} /> Yangilash
              </button>
            </div>

            {stats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Brain size={40} />
                <p className="font-bold">Bugun quest yaratilmagan</p>
                <p className="text-sm">Har kuni 00:00 da avtomatik yaratiladi yoki moduldan "Quest yaratish" bosing</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.map(s => (
                  <div key={s.quest_id} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-black text-slate-900">{s.module_name}</p>
                        <p className="text-xs text-slate-400">{s.course_name} · {s.question_count} savol</p>
                      </div>
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Faol</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: "O'quvchilar", value: s.enrolled_students, color: 'text-violet-600' },
                        { label: 'Urinishlar', value: `${s.total_attempts}/${s.enrolled_students}`, color: 'text-sky-600' },
                        { label: 'Muvaffaqiyat', value: `${s.pass_rate}%`, color: s.pass_rate >= 50 ? 'text-emerald-600' : 'text-amber-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                          <p className={`text-lg font-black ${color}`}>{value}</p>
                          <p className="text-[10px] text-slate-400">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ec5b13] rounded-full transition-all"
                        style={{ width: `${s.completion_rate}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 text-right">{s.completion_rate}% bajarildi</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <ModuleModal
          courses={courses}
          module={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
};

// Missing import fix
function BookOpen({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
