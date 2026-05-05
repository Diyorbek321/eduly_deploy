import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';
import {
  Plus, Calendar as CalendarIcon, FileText,
  Trash2, Eye, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Modal } from '@/src/components/Modal';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';

interface GroupInfo {
  id: number;
  name: string;
}

interface Homework {
  id: string;
  teacherId: number;
  groupId: number;
  groupName: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
}

const STORAGE_KEY = 'edusaas_homeworks';

const loadHomeworks = (): Homework[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveHomeworks = (homeworks: Homework[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(homeworks));
};

export function TeacherHomework() {
  const { user } = useAuth();
  const teacherId = user?.teacherId ?? null;
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({ groupId: '', title: '', description: '', dueDate: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    if (teacherId === null) return;
    const all = loadHomeworks();
    setHomeworks(all.filter(h => h.teacherId === teacherId));
  }, [teacherId]);

  const fetchGroups = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get('/teacher/stats');
      const grps: GroupInfo[] = data.groups.map((g: any) => ({ id: g.id, name: g.name }));
      setGroups(grps);
      if (grps.length > 0) {
        setSelectedGroupId(grps[0].id);
        setFormData(p => ({ ...p, groupId: String(grps[0].id) }));
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setLoadError(typeof detail === 'string' ? detail : "Guruhlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const getGroupName = (id: number) => groups.find(g => g.id === id)?.name || '—';

  const handleCreateHomework = () => {
    setFormError('');
    if (!formData.groupId) { setFormError("Guruhni tanlang!"); return; }
    if (!formData.title.trim()) { setFormError("Sarlavha kiriting!"); return; }
    if (!formData.dueDate) { setFormError("Muddatni kiriting!"); return; }
    if (teacherId === null) return;

    setIsSaving(true);
    const gId = Number(formData.groupId);
    const newHw: Homework = {
      id: `hw_${Date.now()}`,
      teacherId,
      groupId: gId,
      groupName: getGroupName(gId),
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const all = loadHomeworks();
    all.unshift(newHw);
    saveHomeworks(all);
    setHomeworks(prev => [newHw, ...prev]);
    setIsCreateOpen(false);
    resetForm();
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Uy vazifasini o'chirmoqchimisiz?")) return;
    const all = loadHomeworks();
    saveHomeworks(all.filter(h => h.id !== id));
    setHomeworks(prev => prev.filter(h => h.id !== id));
  };

  const resetForm = () => {
    setFormData(p => ({ ...p, title: '', description: '', dueDate: '' }));
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    if (selectedGroupId) setFormData(p => ({ ...p, groupId: String(selectedGroupId) }));
    else if (groups.length > 0) setFormData(p => ({ ...p, groupId: String(groups[0].id) }));
    setIsCreateOpen(true);
  };

  const filteredHomeworks = selectedGroupId
    ? homeworks.filter(h => h.groupId === selectedGroupId)
    : homeworks;

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

  if (teacherId === null) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="text-center py-20 text-slate-400">
          <p className="font-bold">{loadError || "O'qituvchi profili topilmadi"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Uy vazifalari</h1>
          <p className="text-slate-500 mt-1">Guruhlar bo'yicha vazifalarni boshqaring</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchGroups} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={openCreate}
            className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200"
          >
            <Plus size={20} /> Vazifa berish
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Groups Sidebar */}
        <div className="lg:w-64 space-y-2 flex-shrink-0">
          <h2 className="font-black text-slate-900 mb-3 px-1">Guruhlar</h2>
          <button
            onClick={() => setSelectedGroupId(null)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors flex justify-between items-center",
              !selectedGroupId ? "bg-orange-50 text-[#ec5b13]" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
          >
            <span>Barchasi</span>
            <span className="text-xs font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">{homeworks.length}</span>
          </button>
          {groups.map(group => {
            const count = homeworks.filter(h => h.groupId === group.id).length;
            return (
              <button key={group.id} onClick={() => setSelectedGroupId(group.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors flex justify-between items-center",
                  selectedGroupId === group.id ? "bg-orange-50 text-[#ec5b13]" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                )}
              >
                <span className="truncate mr-2">{group.name}</span>
                <span className="text-xs font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg flex-shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Homework List */}
        <div className="flex-1 space-y-4">
          {filteredHomeworks.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200">
              <FileText size={48} className="mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-900">Vazifalar yo'q</h3>
              <p className="text-slate-500 mt-1">Hali hech qanday vazifa berilmagan</p>
              <button onClick={openCreate} className="mt-4 px-6 py-2.5 bg-[#ec5b13] text-white rounded-xl font-bold text-sm hover:bg-orange-600">
                Vazifa berish
              </button>
            </div>
          ) : (
            filteredHomeworks.map(hw => {
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = hw.dueDate < today;
              return (
                <div key={hw.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{hw.title}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-orange-50 text-[#ec5b13] rounded-lg">{hw.groupName}</span>
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", isOverdue ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                        {isOverdue ? "Muddati o'tgan" : "Faol"}
                      </span>
                    </div>
                    {hw.description && <p className="text-slate-600 text-sm mb-3 line-clamp-2">{hw.description}</p>}
                    <div className="flex items-center gap-6 text-sm text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon size={14} /> Muddat: <span className={isOverdue ? "text-rose-500 font-bold" : ""}>{hw.dueDate}</span>
                      </span>
                      <span className="flex items-center gap-1.5"><FileText size={14} /> Berilgan: {hw.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { setSelectedHomework(hw); setIsViewOpen(true); }} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl" title="Ko'rish"><Eye size={18} /></button>
                    <button onClick={() => handleDelete(hw.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl" title="O'chirish"><Trash2 size={18} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm(); }} title="Yangi uy vazifasi"
        footer={<>
          <button onClick={() => { setIsCreateOpen(false); resetForm(); }} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600">Bekor qilish</button>
          <button onClick={handleCreateHomework} disabled={isSaving} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {formError && <div className="bg-rose-50 text-rose-700 text-sm font-bold px-4 py-3 rounded-xl">{formError}</div>}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Guruh *</label>
            <select value={formData.groupId} onChange={e => setFormData(p => ({ ...p, groupId: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20">
              <option value="">Guruhni tanlang</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Sarlavha *</label>
            <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="Masalan: React Hooks amaliyoti"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Tavsif</label>
            <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Vazifa haqida batafsil..." rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-sm resize-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Muddat *</label>
            <input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20" />
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={selectedHomework?.title || 'Uy vazifasi'}
        footer={<button onClick={() => setIsViewOpen(false)} className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600">Yopish</button>}
      >
        {selectedHomework && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-black text-slate-400 uppercase mb-1">Guruh</p>
                <p className="font-bold text-slate-900">{selectedHomework.groupName}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-black text-slate-400 uppercase mb-1">Muddat</p>
                <p className={cn("font-bold", selectedHomework.dueDate < new Date().toISOString().split('T')[0] ? "text-rose-600" : "text-slate-900")}>
                  {selectedHomework.dueDate}
                </p>
              </div>
            </div>
            {selectedHomework.description && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">Tavsif</p>
                <p className="text-slate-700 text-sm leading-relaxed">{selectedHomework.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      </main>
    </div>
  );
}
