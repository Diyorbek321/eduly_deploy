import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Phone, X, Loader2, Search, Tag, Calendar,
  Mail, ChevronRight, RefreshCw, TrendingUp, Users,
} from 'lucide-react';
import api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  stage: string;
  course_interest: string | null;
  notes: string | null;
  trial_date: string | null;
  lost_reason: string | null;
  created_at: string;
}

interface PipelineStats {
  total: number;
  by_stage: Record<string, number>;
  conversion_rate: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES = [
  { key: "Yangi",             label: "Yangi",              color: "#6366f1", bg: "bg-violet-50",  border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
  { key: "Qo'ng'iroq",       label: "Qo'ng'iroq",         color: "#f59e0b", bg: "bg-amber-50",   border: "border-amber-200",  badge: "bg-amber-100 text-amber-700" },
  { key: "Sinov darsi",       label: "Sinov darsi",        color: "#3b82f6", bg: "bg-sky-50",     border: "border-sky-200",    badge: "bg-sky-100 text-sky-700" },
  { key: "Ro'yxatdan o'tdi", label: "Ro'yxatdan o'tdi",   color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700" },
  { key: "Yo'qotildi",       label: "Yo'qotildi",         color: "#ef4444", bg: "bg-rose-50",    border: "border-rose-200",   badge: "bg-rose-100 text-rose-700" },
];

const SOURCES = ["Ijtimoiy tarmoq", "Tavsiya", "Reklama", "Vebsayt", "Boshqa"];

const INPUT = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white";

function stageStyle(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[0];
}

// ─── Lead Card ───────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: () => void;
  onClick: (lead: Lead) => void;
  isDragging: boolean;
}

const LeadCard = ({ lead, onDragStart, onDragEnd, onClick, isDragging }: LeadCardProps) => {
  const st = stageStyle(lead.stage);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      className={`bg-white border border-slate-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-slate-900 text-sm leading-tight truncate">{lead.name}</p>
        <ChevronRight size={13} className="text-slate-300 flex-shrink-0 mt-0.5" />
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Phone size={10} />{lead.phone}</span>
        {lead.email && <span className="flex items-center gap-1.5"><Mail size={10} className="flex-shrink-0" /><span className="truncate">{lead.email}</span></span>}
        {lead.course_interest && <span className="flex items-center gap-1.5"><Tag size={10} />{lead.course_interest}</span>}
        {lead.trial_date && (
          <span className="flex items-center gap-1.5 text-sky-600 font-medium">
            <Calendar size={10} />Sinov: {new Date(lead.trial_date).toLocaleDateString('uz-UZ')}
          </span>
        )}
      </div>
      {lead.source && (
        <div className="mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.source === 'Vebsayt' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
            {lead.source}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface ColumnProps {
  stage: typeof STAGES[0];
  leads: Lead[];
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: () => void;
  onDrop: (stageKey: string) => void;
  onAddLead: (stageKey: string) => void;
  onLeadClick: (lead: Lead) => void;
  draggingId: number | null;
}

const KanbanColumn = ({ stage, leads, onDragStart, onDragEnd, onDrop, onAddLead, onLeadClick, draggingId }: ColumnProps) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={`flex-1 min-w-[220px] max-w-xs flex flex-col rounded-2xl border transition-all ${isOver ? 'border-[#ec5b13] bg-orange-50/30' : `${stage.border} ${stage.bg}`}`}
      onDragOver={e => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => { setIsOver(false); onDrop(stage.key); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-black text-slate-800">{stage.label}</span>
          <span className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: stage.color }}>{leads.length}</span>
        </div>
        <button type="button" onClick={() => onAddLead(stage.key)}
          className="size-6 rounded-lg flex items-center justify-center hover:bg-white/70 text-slate-400 hover:text-slate-700 transition-colors">
          <Plus size={13} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] max-h-[520px]">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onLeadClick}
            isDragging={draggingId === lead.id}
          />
        ))}
        {leads.length === 0 && (
          <div className={`flex items-center justify-center h-16 text-xs text-slate-400 border-2 border-dashed rounded-xl transition-colors ${isOver ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-slate-200'}`}>
            {isOver ? 'Tashlang' : 'Bo\'sh'}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Lead Modal ───────────────────────────────────────────────────────────────

interface LeadModalProps {
  lead: Lead | null;
  defaultStage?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const LeadModal = ({ lead, defaultStage, onClose, onSaved, onDeleted }: LeadModalProps) => {
  const isEdit = !!lead;
  const [form, setForm] = useState({
    name: lead?.name ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    source: lead?.source ?? '',
    stage: lead?.stage ?? defaultStage ?? 'Yangi',
    course_interest: lead?.course_interest ?? '',
    notes: lead?.notes ?? '',
    trial_date: lead?.trial_date?.slice(0, 10) ?? '',
    lost_reason: lead?.lost_reason ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError("Ism va telefon majburiy"); return; }
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name, phone: form.phone, email: form.email || null,
        source: form.source || null, stage: form.stage,
        course_interest: form.course_interest || null,
        notes: form.notes || null,
        trial_date: form.trial_date || null,
        lost_reason: form.lost_reason || null,
      };
      if (isEdit) {
        await api.patch(`/crm/leads/${lead!.id}`, payload);
      } else {
        await api.post('/crm/leads', payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!lead || !onDeleted) return;
    setDeleting(true);
    try {
      await api.delete(`/crm/leads/${lead.id}`);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">{isEdit ? 'Leadni tahrirlash' : 'Yangi lead'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}
          {[
            { label: 'Ism *', key: 'name', placeholder: 'Ali Valiyev' },
            { label: 'Telefon *', key: 'phone', placeholder: '+998901234567' },
            { label: 'Email', key: 'email', placeholder: 'ali@mail.uz' },
            { label: 'Kurs qiziqishi', key: 'course_interest', placeholder: 'Ingliz tili' },
            { label: 'Sinov darsi sanasi', key: 'trial_date', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
              <input type={f.type ?? 'text'} value={(form as any)[f.key]} placeholder={f.placeholder}
                onChange={e => set(f.key, e.target.value)} className={INPUT} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Manba</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={INPUT}>
                <option value="">— Tanlang —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Bosqich</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className={INPUT}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {form.stage === "Yo'qotildi" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Yo'qotilish sababi</label>
              <input value={form.lost_reason} onChange={e => set('lost_reason', e.target.value)} className={INPUT} />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Izohlar</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${INPUT} resize-none`} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          {isEdit && onDeleted && (
            <button type="button" onClick={remove} disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-50">
              {deleting ? <Loader2 size={12} className="animate-spin" /> : 'O\'chirish'}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Bekor
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-[#ec5b13] rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Saqlash' : "Qo'shish"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main CRM Page ────────────────────────────────────────────────────────────

export const CRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalLead, setModalLead] = useState<Lead | null | undefined>(undefined);
  const [defaultStage, setDefaultStage] = useState('Yangi');
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.get('/crm/leads'),
        api.get('/crm/stats'),
      ]);
      const raw = leadsRes.data;
      setLeads(Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []));
      const s = statsRes.data;
      setStats(s?.data ?? s);
    } catch {
      // handled by interceptor
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds to pick up new website registrations
  useEffect(() => {
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const filtered = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
  );

  const byStage = (key: string) => filtered.filter(l => l.stage === key);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLead(lead);
  };

  const handleDragEnd = () => setDraggingLead(null);

  const handleDrop = async (targetStage: string) => {
    if (!draggingLead || draggingLead.stage === targetStage) return;
    const leadId = draggingLead.id;
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: targetStage } : l));
    setDraggingLead(null);
    try {
      await api.patch(`/crm/leads/${leadId}`, { stage: targetStage });
      await fetchAll();
    } catch {
      // revert on error
      await fetchAll();
    }
  };

  const openAdd = (stage: string) => {
    setDefaultStage(stage);
    setModalLead(null);
  };

  const handleSaved = async () => {
    await fetchAll();
  };

  const handleDeleted = async () => {
    await fetchAll();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">CRM Pipeline</h1>
            <p className="text-sm text-slate-400 mt-0.5">Leadlar boshqaruvi · Vebsayt so'rovlari shu yerda ko'rinadi</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refresh} disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={() => openAdd('Yangi')}
              className="flex items-center gap-2 px-4 py-2 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600">
              <Plus size={15} /> Yangi lead
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2.5">
              <TrendingUp size={16} className="text-[#ec5b13]" />
              <div>
                <p className="text-[10px] text-slate-400">Konversiya</p>
                <p className="font-black text-slate-900">{stats.conversion_rate}%</p>
              </div>
            </div>
            {STAGES.map(st => (
              <div key={st.key} className={`rounded-xl border p-3 ${st.border} ${st.bg}`}>
                <p className="text-[10px] font-bold text-slate-500 truncate">{st.label}</p>
                <p className="text-xl font-black mt-0.5" style={{ color: st.color }}>
                  {stats.by_stage[st.key] ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ism yoki telefon..." className="w-full max-w-xs pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-200" />
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-4 md:px-6 pb-6">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={byStage(stage.key)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                onAddLead={openAdd}
                onLeadClick={l => setModalLead(l)}
                draggingId={draggingLead?.id ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalLead !== undefined && (
        <LeadModal
          lead={modalLead}
          defaultStage={defaultStage}
          onClose={() => setModalLead(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};
