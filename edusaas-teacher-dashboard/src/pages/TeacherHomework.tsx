import React from 'react';
import { FileText, Plus, X, Coins, CheckCircle2, XCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Homework {
  id: number;
  group_id: number;
  group_name: string;
  course_name: string | null;
  teacher_id: number;
  teacher_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  coin_reward: number;
  created_at: string;
  total_students: number;
  done_count: number;
  pending_count: number;
}

interface Submission {
  id: number;
  student_id: number;
  student_name: string;
  status: 'pending' | 'done' | 'not_done';
  coins_awarded: number;
  marked_at: string | null;
  note: string | null;
}

interface HomeworkDetail extends Homework {
  submissions: Submission[];
}

interface GroupBrief {
  id: number;
  name: string;
  course_name?: string;
  students_count?: number;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function TeacherHomework() {
  const [homework, setHomework] = React.useState<Homework[]>([]);
  const [groups, setGroups] = React.useState<GroupBrief[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [markingId, setMarkingId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hwRes, statsRes] = await Promise.all([
        api.get<{ items: Homework[]; total: number }>('/homework/teacher'),
        api.get<{ groups: GroupBrief[] }>('/teacher/stats'),
      ]);
      setHomework(hwRes.data.items);
      setGroups(statsRes.data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const handleDelete = async (hwId: number) => {
    if (!confirm("Uy vazifasini o'chirishni xohlaysizmi?")) return;
    try {
      await api.delete(`/homework/${hwId}`);
      setHomework(prev => prev.filter(h => h.id !== hwId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirib bo'lmadi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-orange-50 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#ec5b13]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Uy vazifalari</h1>
            <p className="text-slate-500 text-sm">Vazifa bering, keyingi darsda tekshiring — tizim tangalarni avtomatik beradi.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#ec5b13] text-white rounded-2xl font-bold hover:bg-[#d04f0c] active:scale-95 transition"
        >
          <Plus className="w-4 h-4" /> Vazifa qo'shish
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : homework.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 rounded-3xl">
          <FileText className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-bold">Hali uy vazifasi yo'q</p>
          <p className="text-slate-400 text-sm mt-1">Birinchi vazifani qo'shib boshlang.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homework.map(hw => (
            <HomeworkCard
              key={hw.id}
              hw={hw}
              onMark={() => setMarkingId(hw.id)}
              onDelete={() => handleDelete(hw.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          groups={groups}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void load(); }}
        />
      )}

      {markingId !== null && (
        <MarkModal
          homeworkId={markingId}
          onClose={() => setMarkingId(null)}
          onMarked={() => { setMarkingId(null); void load(); }}
        />
      )}
    </div>
  );
}

// ─── Homework Card ────────────────────────────────────────────────────────────

function HomeworkCard({ hw, onMark, onDelete }: { hw: Homework; onMark: () => void; onDelete: () => void }) {
  const pct = hw.total_students > 0 ? Math.round((hw.done_count / hw.total_students) * 100) : 0;
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 text-lg truncate">{hw.title}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {hw.group_name}{hw.course_name ? ` • ${hw.course_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold whitespace-nowrap">
          <Coins className="w-3 h-3" /> {hw.coin_reward}
        </div>
      </div>

      {hw.description && (
        <p className="text-sm text-slate-600 mt-3 line-clamp-2">{hw.description}</p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <Stat label="Bajardi" value={hw.done_count} color="text-green-600" />
        <Stat label="Kutilmoqda" value={hw.pending_count} color="text-amber-600" />
        <Stat label="Jami" value={hw.total_students} color="text-slate-600" />
      </div>

      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#ec5b13] transition-all" style={{ width: `${pct}%` }} />
      </div>

      {hw.due_date && (
        <p className="text-xs text-slate-400 mt-3">Muddat: {hw.due_date}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onMark}
          className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 active:scale-95 transition"
        >
          Tekshirish
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 active:scale-95 transition"
          aria-label="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ groups, onClose, onCreated }: { groups: GroupBrief[]; onClose: () => void; onCreated: () => void }) {
  const [groupId, setGroupId] = React.useState<number | ''>(groups[0]?.id ?? '');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [coinReward, setCoinReward] = React.useState(5);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !title.trim()) {
      setErr("Guruh va sarlavha majburiy");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await api.post('/homework/', {
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        coin_reward: coinReward,
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Saqlab bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Yangi uy vazifasi</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">{err}</div>}

        <Field label="Guruh">
          <select
            value={groupId}
            onChange={e => setGroupId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#ec5b13] outline-none"
            required
          >
            <option value="" disabled>Tanlang</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}{g.course_name ? ` — ${g.course_name}` : ''}</option>
            ))}
          </select>
        </Field>

        <Field label="Sarlavha">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Masalan: 5-bob 12-mashq"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#ec5b13] outline-none"
            required
          />
        </Field>

        <Field label="Tafsilot (ixtiyoriy)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#ec5b13] outline-none resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Muddat">
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#ec5b13] outline-none"
            />
          </Field>
          <Field label="Tanga (mukofot)">
            <input
              type="number"
              min={0}
              max={1000}
              value={coinReward}
              onChange={e => setCoinReward(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#ec5b13] outline-none"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#ec5b13] text-white rounded-2xl font-bold hover:bg-[#d04f0c] disabled:opacity-50 active:scale-95 transition"
        >
          {submitting ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

// ─── Mark Modal — keyingi dars / tekshirish ───────────────────────────────────

function MarkModal({ homeworkId, onClose, onMarked }: { homeworkId: number; onClose: () => void; onMarked: () => void }) {
  const [detail, setDetail] = React.useState<HomeworkDetail | null>(null);
  const [marks, setMarks] = React.useState<Record<number, 'pending' | 'done' | 'not_done'>>({});
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<HomeworkDetail>(`/homework/${homeworkId}`);
        setDetail(res.data);
        const init: Record<number, 'pending' | 'done' | 'not_done'> = {};
        for (const s of res.data.submissions) init[s.student_id] = s.status;
        setMarks(init);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Yuklab bo'lmadi");
      }
    })();
  }, [homeworkId]);

  const setMark = (studentId: number, status: 'pending' | 'done' | 'not_done') => {
    setMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const submit = async () => {
    if (!detail) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        marks: detail.submissions.map(s => ({
          student_id: s.student_id,
          status: marks[s.student_id] ?? s.status,
          note: s.note ?? null,
        })),
      };
      await api.post(`/homework/${homeworkId}/mark`, payload);
      onMarked();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl p-6 max-h-[90vh] overflow-y-auto space-y-4"
      >
        <div className="flex items-center justify-between sticky top-0 bg-white pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black">Tekshirish</h2>
            {detail && <p className="text-xs text-slate-500 mt-0.5">{detail.title} • {detail.group_name} • <span className="inline-flex items-center gap-1 text-amber-700"><Coins className="w-3 h-3" />{detail.coin_reward}</span></p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">{err}</div>}

        {!detail ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : detail.submissions.length === 0 ? (
          <p className="text-center text-slate-500 py-12">Bu guruhda hali o'quvchi yo'q.</p>
        ) : (
          <div className="space-y-2">
            {detail.submissions.map(s => {
              const current = marks[s.student_id] ?? s.status;
              const credited = s.coins_awarded > 0;
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{s.student_name}</p>
                    {credited && (
                      <p className="text-[10px] text-green-700 font-bold flex items-center gap-1 mt-0.5">
                        <Coins className="w-3 h-3" /> +{s.coins_awarded} berildi
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <MarkBtn active={current === 'done'} onClick={() => setMark(s.student_id, 'done')} kind="done">
                      <CheckCircle2 className="w-4 h-4" />
                    </MarkBtn>
                    <MarkBtn active={current === 'not_done'} onClick={() => setMark(s.student_id, 'not_done')} kind="not_done">
                      <XCircle className="w-4 h-4" />
                    </MarkBtn>
                    <MarkBtn active={current === 'pending'} onClick={() => setMark(s.student_id, 'pending')} kind="pending">
                      <Clock className="w-4 h-4" />
                    </MarkBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-100">
          <button
            onClick={submit}
            disabled={saving || !detail}
            className="w-full py-3 bg-[#ec5b13] text-white rounded-2xl font-bold hover:bg-[#d04f0c] disabled:opacity-50 active:scale-95 transition"
          >
            {saving ? "Saqlanmoqda…" : "Saqlash va tangalarni berish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkBtn({ active, onClick, kind, children }: { active: boolean; onClick: () => void; kind: 'done' | 'not_done' | 'pending'; children: React.ReactNode }) {
  const palette = active
    ? kind === 'done'
      ? 'bg-green-500 text-white'
      : kind === 'not_done'
        ? 'bg-red-500 text-white'
        : 'bg-amber-500 text-white'
    : 'bg-white text-slate-400 hover:text-slate-700';
  return (
    <button type="button" onClick={onClick} className={`p-2 rounded-xl border border-slate-200 ${palette} transition`}>
      {children}
    </button>
  );
}
