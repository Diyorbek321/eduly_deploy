import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  HelpCircle,
  MapPin,
  X,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminCourse {
  id: number;
  name: string;
  description?: string;
  duration?: string;
  price?: string;
  status: string;
}

interface WebsiteCourse {
  id: number;
  center_id: number | null;
  name: string;
  description: string | null;
  duration: string | null;
  price: string | null;
  icon: string | null;
  color: string;
  position: number;
  is_active: boolean;
}

interface WebsiteFAQ {
  id: number;
  center_id: number | null;
  question: string;
  answer: string;
  position: number;
  is_active: boolean;
}

interface WebsiteBranch {
  id: number;
  center_id: number | null;
  name: string;
  address: string;
  phone: string | null;
  working_hours: string | null;
  lat: number | null;
  lng: number | null;
  position: number;
  is_active: boolean;
}

type Tab = 'courses' | 'faqs' | 'branches';

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Field component ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#ec5b13] transition-colors";

// ── Courses Tab ────────────────────────────────────────────────────────────────

function CoursesTab() {
  const [adminCourses, setAdminCourses] = useState<AdminCourse[]>([]);
  const [overlays, setOverlays] = useState<WebsiteCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | AdminCourse>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { description: '', duration: '', price: '', icon: '', color: '#6366f1' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/website/courses'),
      ]);
      const cl = cRes.data?.data ?? cRes.data;
      const ol = oRes.data?.data ?? oRes.data;
      setAdminCourses(Array.isArray(cl) ? cl : []);
      setOverlays(Array.isArray(ol) ? ol : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function getOverlay(course: AdminCourse): WebsiteCourse | undefined {
    return overlays.find(o => o.name.toLowerCase() === course.name.toLowerCase());
  }

  function openCustomize(c: AdminCourse) {
    const overlay = getOverlay(c);
    setForm({
      description: overlay?.description ?? c.description ?? '',
      duration: overlay?.duration ?? c.duration ?? '',
      price: overlay?.price ?? (c.price ? `${Number(c.price).toLocaleString()} UZS/oy` : ''),
      icon: overlay?.icon ?? '',
      color: overlay?.color ?? '#6366f1',
    });
    setModal(c);
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const payload = {
        name: modal.name,
        description: form.description || null,
        duration: form.duration || null,
        price: form.price || null,
        icon: form.icon || null,
        color: form.color,
        position: adminCourses.indexOf(modal),
        is_active: true,
      };
      const overlay = getOverlay(modal);
      if (overlay) {
        await axios.patch(`/api/website/courses/${overlay.id}`, payload);
      } else {
        await axios.post('/api/website/courses', payload);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeOverlay(c: AdminCourse) {
    const overlay = getOverlay(c);
    if (!overlay) return;
    if (!confirm(`"${c.name}" kursining veb-sayt sozlamalarini o'chirasizmi?`)) return;
    await axios.delete(`/api/website/courses/${overlay.id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">{adminCourses.length} ta kurs (admin panelidan avtomatik)</p>
      </div>
      <div className="mb-4 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
        💡 Kurslar admin panelining <strong>Kurslar</strong> bo'limidan avtomatik olinadi.
        Har bir kurs uchun veb-saytda ko'rsatiladigan <strong>emoji, rang va tavsif</strong>ni sozlashingiz mumkin.
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
      ) : adminCourses.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-2 opacity-40" />
          <p>Kurslar yo'q. Admin panelidan kurs qo'shing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminCourses.map((c) => {
            const overlay = getOverlay(c);
            return (
              <div key={c.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: (overlay?.color ?? '#6366f1') + '20' }}
                  >
                    {overlay?.icon || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{overlay ? '✅ Sozlangan' : '⚙️ Sozlanmagan (standart)'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                  {(overlay?.duration ?? c.duration) && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{overlay?.duration ?? c.duration}</span>
                  )}
                  {(overlay?.price ?? c.price) && (
                    <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg font-medium">{overlay?.price ?? c.price}</span>
                  )}
                  {overlay?.color && (
                    <span className="inline-block size-5 rounded-md border border-slate-200 flex-shrink-0" style={{ backgroundColor: overlay.color }} />
                  )}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openCustomize(c)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-orange-50 text-[#ec5b13] rounded-lg hover:bg-orange-100 transition-colors font-medium"
                  >
                    <Pencil size={13} /> Sozlash
                  </button>
                  {overlay && (
                    <button
                      onClick={() => removeOverlay(c)}
                      className="flex items-center gap-1 text-xs px-2 py-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} /> Tozalash
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={`"${modal.name}" — veb-sayt ko'rinishini sozlash`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-500">
              Kurs nomi admin panelidan olinadi: <strong className="text-slate-800">{modal.name}</strong>
            </div>
            <Field label="Tavsif (veb-sayt uchun)">
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Kurs haqida qisqacha..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Davomiyligi">
                <input className={inputCls} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="6 oy" />
              </Field>
              <Field label="Narxi (ko'rsatish uchun)">
                <input className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="800,000 UZS/oy" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ikonka (emoji)">
                <input className={inputCls} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="📚" />
              </Field>
              <Field label="Rang">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-14 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">{form.color}</span>
                </div>
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── FAQ Tab ────────────────────────────────────────────────────────────────────

function FAQTab() {
  const [faqs, setFaqs] = useState<WebsiteFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | WebsiteFAQ>(null);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const emptyForm = { question: '', answer: '', position: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/website/faqs');
      setFaqs(res.data?.data ?? res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setModal('create');
  }

  function openEdit(f: WebsiteFAQ) {
    setForm({ question: f.question, answer: f.answer, position: f.position });
    setModal(f);
  }

  async function save() {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      if (modal === 'create') {
        await axios.post('/api/website/faqs', form);
      } else if (modal && typeof modal === 'object') {
        await axios.patch(`/api/website/faqs/${modal.id}`, form);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(f: WebsiteFAQ) {
    await axios.patch(`/api/website/faqs/${f.id}`, { is_active: !f.is_active });
    await load();
  }

  async function del(f: WebsiteFAQ) {
    if (!confirm(`Bu savolni o'chirasizmi?`)) return;
    await axios.delete(`/api/website/faqs/${f.id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{faqs.length} ta savol</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <HelpCircle size={40} className="mx-auto mb-2 opacity-40" />
          <p>FAQ yo'q. Birinchisini qo'shing.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenId(openId === f.id ? null : f.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <HelpCircle size={16} className="text-[#ec5b13] flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-800">{f.question}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg ${f.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {f.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                  <span className="text-xs text-slate-400">#{f.position}</span>
                </div>
              </button>
              {openId === f.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600 mt-3 mb-4 leading-relaxed">{f.answer}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(f)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      {f.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {f.is_active ? "O'chirish" : "Yoqish"}
                    </button>
                    <button
                      onClick={() => openEdit(f)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-[#ec5b13] bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <Pencil size={13} /> Tahrirlash
                    </button>
                    <button
                      onClick={() => del(f)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={13} /> O'chirish
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={modal === 'create' ? "Yangi savol qo'shish" : "Savolni tahrirlash"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Savol *">
              <input className={inputCls} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Ro'yxatdan o'tish qanday amalga oshiriladi?" />
            </Field>
            <Field label="Javob *">
              <textarea className={inputCls} rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Batafsil javob..." />
            </Field>
            <Field label="Tartib raqami">
              <input type="number" className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={save}
                disabled={saving || !form.question.trim() || !form.answer.trim()}
                className="flex-1 bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Branches Tab ───────────────────────────────────────────────────────────────

function BranchesTab() {
  const [branches, setBranches] = useState<WebsiteBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | WebsiteBranch>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: '', address: '', phone: '', working_hours: '', lat: '', lng: '', position: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/website/branches');
      setBranches(res.data?.data ?? res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setModal('create');
  }

  function openEdit(b: WebsiteBranch) {
    setForm({
      name: b.name,
      address: b.address,
      phone: b.phone ?? '',
      working_hours: b.working_hours ?? '',
      lat: b.lat != null ? String(b.lat) : '',
      lng: b.lng != null ? String(b.lng) : '',
      position: b.position,
    });
    setModal(b);
  }

  async function save() {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        phone: form.phone || null,
        working_hours: form.working_hours || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        position: form.position,
      };
      if (modal === 'create') {
        await axios.post('/api/website/branches', payload);
      } else if (modal && typeof modal === 'object') {
        await axios.patch(`/api/website/branches/${modal.id}`, payload);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b: WebsiteBranch) {
    await axios.patch(`/api/website/branches/${b.id}`, { is_active: !b.is_active });
    await load();
  }

  async function del(b: WebsiteBranch) {
    if (!confirm(`"${b.name}" filialini o'chirasizmi?`)) return;
    await axios.delete(`/api/website/branches/${b.id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{branches.length} ta filial</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MapPin size={40} className="mx-auto mb-2 opacity-40" />
          <p>Filiallar yo'q. Birinchisini qo'shing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              {b.lat != null && b.lng != null && (
                <iframe
                  title={b.name}
                  src={`https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed`}
                  width="100%"
                  height="180"
                  className="border-0"
                  loading="lazy"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 ml-2 ${b.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {b.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-1 flex items-start gap-1">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0 text-slate-400" /> {b.address}
                </p>
                {b.phone && <p className="text-sm text-slate-500 mb-1">📞 {b.phone}</p>}
                {b.working_hours && <p className="text-sm text-slate-500 mb-1">🕐 {b.working_hours}</p>}
                {(b.lat != null || b.lng != null) && (
                  <p className="text-xs text-slate-400 mb-2">
                    📍 {b.lat}, {b.lng}
                  </p>
                )}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => toggleActive(b)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    {b.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {b.is_active ? "O'chirish" : "Yoqish"}
                  </button>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 text-slate-400 hover:text-[#ec5b13] hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => del(b)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal
          title={modal === 'create' ? "Yangi filial qo'shish" : "Filialni tahrirlash"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Nomi *">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Markaziy filial" />
            </Field>
            <Field label="Manzil *">
              <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Toshkent, Chilonzor tumani, ..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" />
              </Field>
              <Field label="Ish vaqti">
                <input className={inputCls} value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} placeholder="Du-Sha 9:00-19:00" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kenglik (lat)">
                <input type="number" step="any" className={inputCls} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="41.2995" />
              </Field>
              <Field label="Uzunlik (lng)">
                <input type="number" step="any" className={inputCls} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="69.2401" />
              </Field>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">
              <strong>Koordinatalarni olish:</strong> Google Maps'ni oching → manzilga o'ng klik → "Bu yer haqida" → birinchi qator ikkita raqam (kenglik, uzunlik).
            </p>
            <Field label="Tartib raqami">
              <input type="number" className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.address.trim()}
                className="flex-1 bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function WebsiteManager() {
  const [tab, setTab] = useState<Tab>('courses');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'courses', label: 'Kurslar', icon: <BookOpen size={16} /> },
    { key: 'faqs', label: 'FAQ', icon: <HelpCircle size={16} /> },
    { key: 'branches', label: 'Filiallar', icon: <MapPin size={16} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 bg-[#ec5b13] rounded-xl flex items-center justify-center text-white">
          <Globe size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Veb-sayt boshqaruvi</h1>
          <p className="text-sm text-slate-500">Ta'lim markazi veb-saytining kontentini boshqaring</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-[#ec5b13] text-[#ec5b13] bg-orange-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'courses' && <CoursesTab />}
          {tab === 'faqs' && <FAQTab />}
          {tab === 'branches' && <BranchesTab />}
        </div>
      </div>
    </div>
  );
}
