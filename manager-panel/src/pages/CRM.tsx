import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Phone, Mail, Search, X, ChevronRight, User,
  Calendar, Tag, AlertCircle, CheckCircle2, Loader2,
  TrendingUp, Filter, MoreVertical, Trash2, Edit3,
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
  assigned_to_name: string | null;
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
  { key: "Yangi",              label: "Yangi",               color: "#6366f1", bg: "bg-violet-50",  border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
  { key: "Qo'ng'iroq",        label: "Qo'ng'iroq",          color: "#f59e0b", bg: "bg-amber-50",   border: "border-amber-200",  badge: "bg-amber-100 text-amber-700" },
  { key: "Sinov darsi",        label: "Sinov darsi",         color: "#3b82f6", bg: "bg-sky-50",     border: "border-sky-200",    badge: "bg-sky-100 text-sky-700" },
  { key: "Ro'yxatdan o'tdi",  label: "Ro'yxatdan o'tdi",    color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700" },
  { key: "Yo'qotildi",        label: "Yo'qotildi",          color: "#ef4444", bg: "bg-rose-50",    border: "border-rose-200",   badge: "bg-rose-100 text-rose-700" },
];

const SOURCES = ["Ijtimoiy tarmoq", "Tavsiya", "Reklama", "Vebsayt", "Boshqa"];

function stageStyle(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[0];
}

// ─── Lead Card ───────────────────────────────────────────────────────────────

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const st = stageStyle(lead.stage);
  return (
    <div
      onClick={() => onOpen(lead)}
      className="bg-white border border-slate-200 rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-slate-900 text-sm leading-tight">{lead.name}</p>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-[#ec5b13] flex-shrink-0 transition-colors" />
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Phone size={11} />{lead.phone}</span>
        {lead.email && <span className="flex items-center gap-1.5"><Mail size={11} />{lead.email}</span>}
        {lead.course_interest && <span className="flex items-center gap-1.5"><Tag size={11} />{lead.course_interest}</span>}
        {lead.trial_date && (
          <span className="flex items-center gap-1.5 text-sky-600 font-medium">
            <Calendar size={11} />Sinov: {new Date(lead.trial_date).toLocaleDateString('uz-UZ')}
          </span>
        )}
      </div>
      {lead.source && (
        <div className="mt-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{lead.source}</span>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Column ─────────────────────────────────────────────────────────

function PipelineColumn({
  stage, leads, onAddLead, onOpen,
}: {
  stage: typeof STAGES[0];
  leads: Lead[];
  onAddLead: (stageKey: string) => void;
  onOpen: (l: Lead) => void;
}) {
  return (
    <div className={`flex-1 min-w-[220px] max-w-xs flex flex-col rounded-2xl border ${stage.border} ${stage.bg}`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-black text-slate-800">{stage.label}</span>
          <span
            className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: stage.color }}
          >
            {leads.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddLead(stage.key)}
          className="size-6 rounded-lg flex items-center justify-center hover:bg-white/70 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[520px]">
        {leads.map(l => (
          <LeadCard key={l.id} lead={l} onOpen={onOpen} />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-400">Bo'sh</div>
        )}
      </div>
    </div>
  );
}

// ─── Lead Modal ──────────────────────────────────────────────────────────────

function LeadModal({
  lead,
  defaultStage,
  onClose,
  onSaved,
  onDeleted,
}: {
  lead: Lead | null;
  defaultStage?: string;
  onClose: () => void;
  onSaved: (l: Lead) => void;
  onDeleted?: (id: number) => void;
}) {
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
      const payload: Record<string, any> = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        source: form.source || null,
        stage: form.stage,
        course_interest: form.course_interest || null,
        notes: form.notes || null,
        trial_date: form.trial_date || null,
        lost_reason: form.lost_reason || null,
      };
      let res;
      if (isEdit) {
        res = await api.patch(`/crm/leads/${lead!.id}`, payload);
      } else {
        res = await api.post('/crm/leads', payload);
      }
      onSaved(res.data?.data ?? res.data);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!lead || !onDeleted) return;
    setDeleting(true);
    try {
      await api.delete(`/crm/leads/${lead.id}`);
      onDeleted(lead.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const fields: { label: string; key: string; type?: string; as?: 'select' | 'textarea'; options?: string[] }[] = [
    { label: 'Ism *', key: 'name' },
    { label: 'Telefon *', key: 'phone', type: 'tel' },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Kurs qiziqishi', key: 'course_interest' },
    { label: 'Sinov darsi sanasi', key: 'trial_date', type: 'date' },
    { label: 'Manba', key: 'source', as: 'select', options: SOURCES },
    { label: 'Bosqich', key: 'stage', as: 'select', options: STAGES.map(s => s.key) },
  ];
  if (form.stage === "Yo'qotildi") {
    fields.push({ label: 'Yo\'qotilish sababi', key: 'lost_reason' });
  }
  fields.push({ label: 'Izohlar', key: 'notes', as: 'textarea' });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">{isEdit ? 'Leadni tahrirlash' : 'Yangi lead'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
              {f.as === 'select' ? (
                <select
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                >
                  <option value="">— Tanlang —</option>
                  {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.as === 'textarea' ? (
                <textarea
                  rows={3}
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
                />
              ) : (
                <input
                  type={f.type ?? 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          {isEdit && onDeleted && (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              O'chirish
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Bekor
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-[#ec5b13] rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Saqlash' : 'Qo\'shish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM page ───────────────────────────────────────────────────────────

export const CRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalLead, setModalLead] = useState<Lead | null | undefined>(undefined); // undefined = closed, null = new
  const [defaultStage, setDefaultStage] = useState('Yangi');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.get('/crm/leads'),
        api.get('/crm/stats'),
      ]);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.data ?? []));
      setStats(statsRes.data?.data ?? statsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
  );

  const byStage = (key: string) => filtered.filter(l => l.stage === key);

  const handleSaved = (l: Lead) => {
    setLeads(prev => {
      const idx = prev.findIndex(x => x.id === l.id);
      return idx >= 0 ? prev.map(x => x.id === l.id ? l : x) : [l, ...prev];
    });
    fetchData(); // refresh stats too
  };

  const handleDeleted = (id: number) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    fetchData();
  };

  const openAdd = (stage: string) => {
    setDefaultStage(stage);
    setModalLead(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

      <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-5">

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
            <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-[#ec5b13]" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Konversiya</p>
                <p className="text-xl font-black text-slate-900">{stats.conversion_rate}%</p>
              </div>
            </div>
            {STAGES.map(st => (
              <div key={st.key} className={`rounded-2xl border ${st.border} ${st.bg} p-3`}>
                <p className="text-[10px] font-bold text-slate-500 mb-1">{st.label}</p>
                <p className="text-2xl font-black" style={{ color: st.color }}>
                  {stats.by_stage[st.key] ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => openAdd('Yangi')}
            className="flex items-center gap-2 px-4 py-2 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={15} />
            Yangi lead
          </button>
        </div>

        {/* Pipeline board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span>Yuklanmoqda...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 h-full min-w-max pb-4">
              {STAGES.map(st => (
                <PipelineColumn
                  key={st.key}
                  stage={st}
                  leads={byStage(st.key)}
                  onAddLead={openAdd}
                  onOpen={l => setModalLead(l)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

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
