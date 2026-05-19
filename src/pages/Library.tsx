import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Trash2, X, Plus, BookOpen, Film, Image, File } from 'lucide-react';
import api from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { Modal } from '@/src/components/Modal';

interface Group {
  id: number;
  name: string;
}

interface Material {
  id: number;
  group_id: number;
  group_name: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: 'pdf' | 'video' | 'image' | 'doc' | 'other';
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string | null;
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pdf:   { label: 'PDF',   color: 'bg-red-100 text-red-600',    icon: FileText },
  video: { label: 'Video', color: 'bg-purple-100 text-purple-600', icon: Film },
  image: { label: 'Rasm',  color: 'bg-blue-100 text-blue-600',  icon: Image },
  doc:   { label: 'Hujjat', color: 'bg-amber-100 text-amber-600', icon: File },
  other: { label: 'Fayl',  color: 'bg-slate-100 text-slate-600', icon: File },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const Library = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: '', description: '', group_id: '' });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    api.get('/groups').then(r => setGroups(r.data as Group[])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (selectedGroupId) params.group_id = String(selectedGroupId);
    api.get('/materials/', { params })
      .then(r => setMaterials(r.data as Material[]))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [selectedGroupId]);

  const handleUpload = async () => {
    if (!form.title || !form.group_id || !file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('group_id', form.group_id);
      if (form.description) fd.append('description', form.description);
      fd.append('file', file);
      await api.post('/materials/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setIsModalOpen(false);
      setForm({ title: '', description: '', group_id: '' });
      setFile(null);
      // refresh
      const params: Record<string, string> = {};
      if (selectedGroupId) params.group_id = String(selectedGroupId);
      const r = await api.get('/materials/', { params });
      setMaterials(r.data as Material[]);
    } catch {
      // keep modal open
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/materials/${id}`);
    setMaterials(prev => prev.filter(m => m.id !== id));
    setDeleteId(null);
  };

  const displayed = selectedGroupId
    ? materials.filter(m => m.group_id === selectedGroupId)
    : materials;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
            <BookOpen size={20} className="text-[#ec5b13]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Kutubxona</h1>
            <p className="text-xs text-slate-400">O'quvchilar uchun materiallar</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
        >
          <Upload size={16} />
          Material yuklash
        </button>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedGroupId(null)}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
            selectedGroupId === null ? 'bg-[#ec5b13] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Barchasi
        </button>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => setSelectedGroupId(g.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              selectedGroupId === g.id ? 'bg-[#ec5b13] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Materials grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BookOpen size={48} className="mx-auto text-slate-200" />
          <p className="text-slate-400 font-medium">Hali material yuklanmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(m => {
            const meta = TYPE_META[m.file_type] ?? TYPE_META.other;
            const Icon = meta.icon;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.group_name}</p>
                    </div>
                  </div>
                  <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full shrink-0', meta.color)}>
                    {meta.label}
                  </span>
                </div>
                {m.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{m.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatBytes(m.file_size)}</span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-2 bg-slate-50 hover:bg-[#ec5b13] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Ko'rish
                  </a>
                  <button
                    onClick={() => setDeleteId(m.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setFile(null); setForm({ title: '', description: '', group_id: '' }); }}
        title="Material yuklash"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Bekor qilish
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !form.title || !form.group_id || !file}
              className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Yuklanmoqda…' : 'Yuklash'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Sarlavha</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20"
              placeholder="Masalan: Unit 3 — Grammar notes"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Guruh</label>
            <select
              value={form.group_id}
              onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Tavsif (ixtiyoriy)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm h-20 resize-none focus:ring-2 focus:ring-orange-500/20"
              placeholder="Qisqacha izoh..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Fayl</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full px-4 py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 cursor-pointer transition-all text-center"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={16} className="text-[#ec5b13]" />
                  <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload size={20} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-400 font-medium">PDF, Video, Rasm yoki Hujjat yuklang</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Materialni o'chirish"
        footer={
          <>
            <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">O'chirish</button>
          </>
        }
      >
        <p className="text-sm text-slate-600 text-center">Materialni o'chirishni tasdiqlaysizmi? Bu amalni bekor qilib bo'lmaydi.</p>
      </Modal>
    </div>
  );
};
