import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Loader2, BarChart2, Users,
  CheckCircle2, Clock, PauseCircle, PlayCircle,
  ChevronDown, ChevronUp, Edit3,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import api from '@/src/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PollOption {
  id: number;
  emoji: string;
  label: string;
  position: number;
  count: number;
  percent: number;
}

interface Poll {
  id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'closed';
  target_group_id: number | null;
  target_group_name: string | null;
  ends_at: string | null;
  created_at: string;
  options: PollOption[];
  total_responses: number;
}

interface Group { id: number; name: string }

// ─── Default emoji options ────────────────────────────────────────────────────

const DEFAULT_OPTIONS = [
  { emoji: '🤩', label: 'Ajoyib' },
  { emoji: '😊', label: 'Yaxshi' },
  { emoji: '😐', label: 'Unchalik emas' },
  { emoji: '😞', label: 'Yomon' },
];

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS = {
  active: { label: 'Faol', cls: 'bg-emerald-100 text-emerald-700', icon: PlayCircle },
  draft:  { label: 'Qoralama', cls: 'bg-slate-100 text-slate-600', icon: PauseCircle },
  closed: { label: 'Yakunlangan', cls: 'bg-rose-100 text-rose-600', icon: CheckCircle2 },
};

// ─── Result bar ───────────────────────────────────────────────────────────────

function ResultBar({ opt, total }: { opt: PollOption; total: number }) {
  const pct = total ? Math.round((opt.count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-8 text-center">{opt.emoji}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold text-slate-700">{opt.label}</span>
          <span className="text-slate-500">{opt.count} ta ({pct}%)</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ec5b13,#f97316)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreatePollModal({
  groups,
  onClose,
  onCreated,
}: {
  groups: Group[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS.map((o, i) => ({ ...o, position: i })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setOpt = (i: number, field: 'emoji' | 'label', val: string) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  const addOption = () => setOptions(prev => [...prev, { emoji: '⭐', label: 'Yangi variant', position: prev.length }]);
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!title.trim()) { setError("Sarlavha majburiy"); return; }
    if (options.some(o => !o.label.trim())) { setError("Barcha variantlar to'ldirilsin"); return; }
    setSaving(true); setError('');
    try {
      await api.post('/polls/', {
        title,
        description: description || null,
        target_group_id: targetGroupId ? Number(targetGroupId) : null,
        ends_at: endsAt || null,
        options: options.map((o, i) => ({ emoji: o.emoji, label: o.label, position: i })),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Yangi so'rovnoma</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Sarlavha *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Masalan: O'qituvchingizni baholang"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tavsif</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ixtiyoriy qo'shimcha ma'lumot"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Guruh (ixtiyoriy)</label>
              <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                <option value="">Barcha o'quvchilar</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Muddat (ixtiyoriy)</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Variantlar</label>
              <button type="button" onClick={addOption}
                className="text-xs font-bold text-[#ec5b13] hover:underline flex items-center gap-1">
                <Plus size={13} /> Qo'shish
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <input
                    value={opt.emoji}
                    onChange={e => setOpt(i, 'emoji', e.target.value)}
                    className="w-12 text-center text-xl bg-white border border-slate-200 rounded-lg py-1 outline-none"
                    maxLength={4}
                  />
                  <input
                    value={opt.label}
                    onChange={e => setOpt(i, 'label', e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Variant nomi"
                  />
                  <button type="button" onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 disabled:opacity-30">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Bekor
          </button>
          <button type="button" onClick={submit} disabled={saving}
            className="flex-1 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Yaratish
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Poll Card ────────────────────────────────────────────────────────────────

function PollCard({ poll, onRefresh }: { poll: Poll; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const st = STATUS[poll.status] ?? STATUS.active;
  const Icon = st.icon;

  const toggleStatus = async () => {
    const next = poll.status === 'active' ? 'closed' : 'active';
    setToggling(true);
    try {
      await api.patch(`/polls/${poll.id}`, { status: next });
      onRefresh();
    } finally {
      setToggling(false);
    }
  };

  const deletePoll = async () => {
    if (!confirm(`"${poll.title}" o'chirilsinmi?`)) return;
    await api.delete(`/polls/${poll.id}`);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>
                <Icon size={11} /> {st.label}
              </span>
              {poll.target_group_name && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
                  {poll.target_group_name}
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-900 text-base">{poll.title}</h3>
            {poll.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{poll.description}</p>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Users size={13} />
              {poll.total_responses} ovoz
            </div>
            <button type="button" onClick={toggleStatus} disabled={toggling}
              className={`p-2 rounded-xl transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40`}
              title={poll.status === 'active' ? 'Yakunlash' : 'Faollashtirish'}>
              {toggling ? <Loader2 size={15} className="animate-spin" /> : poll.status === 'active' ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
            </button>
            <button type="button" onClick={deletePoll}
              className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
              <Trash2 size={15} />
            </button>
            <button type="button" onClick={() => setExpanded(v => !v)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Options preview */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {poll.options.map(opt => (
            <span key={opt.id} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-medium text-slate-700">
              <span className="text-base leading-none">{opt.emoji}</span>
              {opt.label}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded results */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={15} className="text-[#ec5b13]" />
            <span className="text-xs font-black text-slate-700">Natijalar — {poll.total_responses} ta ovoz</span>
          </div>
          {poll.total_responses === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">Hali ovoz yo'q</p>
          ) : (
            poll.options.map(opt => (
              <ResultBar key={opt.id} opt={opt} total={poll.total_responses} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const Polls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pollsRes, groupsRes] = await Promise.all([
        api.get('/polls/'),
        api.get('/groups'),
      ]);
      setPolls(Array.isArray(pollsRes.data) ? pollsRes.data : (pollsRes.data?.data ?? []));
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data?.data ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = polls.filter(p => filter === 'all' || p.status === filter);
  const active = polls.filter(p => p.status === 'active').length;
  const totalVotes = polls.reduce((s, p) => s + p.total_responses, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      <Header title="So'rovnomalar" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto w-full">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Jami so'rovnomalar", value: polls.length, accent: '#6366f1' },
            { label: 'Faol', value: active, accent: '#10b981' },
            { label: 'Jami ovozlar', value: totalVotes, accent: '#ec5b13' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
              <p className="text-2xl font-black" style={{ color: accent }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {(['all', 'active', 'closed'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-[#ec5b13] text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                {f === 'all' ? 'Barchasi' : f === 'active' ? 'Faol' : 'Yakunlangan'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600">
            <Plus size={16} /> Yangi so'rovnoma
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <BarChart2 size={40} />
            <p className="font-bold">So'rovnomalar yo'q</p>
            <button type="button" onClick={() => setShowCreate(true)}
              className="text-sm text-[#ec5b13] font-bold hover:underline">Birinchi so'rovnomani yarating</button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(p => <PollCard key={p.id} poll={p} onRefresh={fetchAll} />)}
          </div>
        )}
      </main>

      {showCreate && (
        <CreatePollModal groups={groups} onClose={() => setShowCreate(false)} onCreated={fetchAll} />
      )}
    </div>
  );
};
