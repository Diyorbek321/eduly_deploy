import React, { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Loader2, Trash2, Upload, X } from 'lucide-react';
import api from '../lib/api';

interface Material {
  id: number;
  title: string;
  group_id?: number;
  group_name?: string;
  file_url?: string;
  file_name?: string;
  created_at?: string;
}

interface Group {
  id: number;
  name: string;
}

export const Library = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, gRes] = await Promise.all([
        api.get('/materials'),
        api.get('/groups'),
      ]);
      setMaterials(Array.isArray(mRes.data) ? mRes.data : (mRes.data?.items ?? []));
      setGroups(Array.isArray(gRes.data) ? gRes.data : (gRes.data?.items ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !file) {
      setError("Sarlavha va fayl majburiy");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);
      if (groupId) formData.append('group_id', groupId);

      await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setModalOpen(false);
      setTitle('');
      setGroupId('');
      setFile(null);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/materials/${id}`);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // Group materials by group name
  const grouped: Record<string, Material[]> = {};
  materials.forEach(m => {
    const key = m.group_name ?? 'Umumiy';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const fileIcon = (name?: string) => {
    const ext = name?.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['mp4', 'avi', 'mov'].includes(ext)) return '🎬';
    return '📎';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <FileText size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Kutubxona</h1>
            <p className="text-sm text-slate-400">{materials.length} ta material</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Yuklash</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p>Hozircha materiallar yo'q</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                <h2 className="font-black text-slate-800 text-sm">{groupName}</h2>
                <p className="text-xs text-slate-400">{items.length} ta material</p>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <span className="text-xl flex-shrink-0">{fileIcon(m.file_name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{m.title}</p>
                      {m.file_name && <p className="text-xs text-slate-400 truncate">{m.file_name}</p>}
                      {m.created_at && (
                        <p className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString('uz-UZ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.file_url && (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                        >
                          Ko'rish
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                      >
                        {deletingId === m.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Material yuklash</h2>
              <button type="button" onClick={() => { setModalOpen(false); setTitle(''); setGroupId(''); setFile(null); setError(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="px-6 py-5 space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Sarlavha *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Material nomi" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Guruh</label>
                <select value={groupId} onChange={e => setGroupId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
                  <option value="">Umumiy (guruhsiz)</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Fayl *</label>
                <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center gap-2 border border-emerald-200 rounded-xl px-3.5 py-2.5 bg-emerald-50">
                    <span className="flex-1 text-sm font-bold text-slate-900 truncate">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl px-3.5 py-6 text-sm text-slate-400 hover:border-orange-300 hover:text-orange-400 transition-colors flex flex-col items-center gap-2">
                    <Plus size={20} />
                    Fayl tanlash
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setTitle(''); setGroupId(''); setFile(null); setError(''); }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Bekor
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 bg-[#ec5b13] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  Yuklash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
