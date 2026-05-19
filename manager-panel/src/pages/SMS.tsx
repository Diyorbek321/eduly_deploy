import { SMSTemplateManager, SMSTemplate } from '../components/SMSTemplateManager';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  User,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';

import api from '../lib/api';

type SMSCategory = 'Qarzdorlik' | 'Davomat' | "E'lon" | 'Boshqa';
type SMSStatus = 'Yuborildi' | 'Kutilmoqda' | 'Xatolik';

interface SMSHistoryItem {
  id: number;
  recipient_name: string;
  recipient_phone: string;
  message: string;
  category: SMSCategory;
  status: SMSStatus;
  created_at: string;
  error?: string | null;
}

interface GroupOption {
  id: number;
  name: string;
}

type RecipientType = 'individual' | 'group' | 'all' | 'debtors';

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

export const SMS = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'Yangi xabar' | 'Tarix' | 'Shablonlar'>('Yangi xabar');

  const [history, setHistory] = useState<SMSHistoryItem[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [balance, setBalance] = useState<{ remaining: number; provider: string } | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<{
    recipientType: RecipientType;
    recipient: string;
    phone: string;
    groupId: number | '';
    category: SMSCategory;
    message: string;
  }>({
    recipientType: 'individual',
    recipient: '',
    phone: '',
    groupId: '',
    category: 'Boshqa',
    message: '',
  });

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/sms/history');
      setHistory(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/sms/templates');
      setTemplates(
        res.data.map((t: any) => ({
          id: String(t.id),
          title: t.title,
          content: t.content,
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get('/sms/balance');
      setBalance({ remaining: res.data.remaining, provider: res.data.provider });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/groups');
        const raw = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setGroupOptions(raw.map((g: any) => ({ id: g.id, name: g.name })));
      } catch {
        /* ignore */
      }
    };
    fetchGroups();
    fetchHistory();
    fetchTemplates();
    fetchBalance();
  }, [fetchHistory, fetchTemplates, fetchBalance]);

  useEffect(() => {
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');
    if (phone || name) {
      setFormData((prev) => ({
        ...prev,
        recipientType: 'individual',
        recipient: name ?? '',
        phone: phone ?? '',
      }));
      setActiveTab('Yangi xabar');
    }
  }, [searchParams]);

  const handleSendSMS = async () => {
    if (!formData.message) return;
    setSending(true);
    try {
      if (formData.recipientType === 'individual') {
        if (!formData.phone) {
          flash('error', 'Telefon raqami kerak');
          return;
        }
        await api.post('/sms/send', {
          recipient_name: formData.recipient || 'Noma\'lum',
          phone: formData.phone,
          message: formData.message,
          category: formData.category,
        });
      } else {
        const payload: Record<string, unknown> = {
          recipient_type: formData.recipientType,
          message: formData.message,
          category: formData.category,
          target_parent: true,
        };
        if (formData.recipientType === 'group') {
          if (!formData.groupId) {
            flash('error', 'Guruhni tanlang');
            return;
          }
          payload.group_id = formData.groupId;
        }
        await api.post('/sms/bulk', payload);
      }
      flash('ok', 'SMS yuborish jarayoni yakunlandi');
      setFormData({
        recipientType: 'individual',
        recipient: '',
        phone: '',
        groupId: '',
        category: 'Boshqa',
        message: '',
      });
      setActiveTab('Tarix');
      await Promise.all([fetchHistory(), fetchBalance()]);
    } catch (err: any) {
      flash('error', err?.response?.data?.error?.message || 'Yuborishda xatolik');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (content: string) => {
    setFormData((prev) => ({ ...prev, message: content }));
    setIsTemplateModalOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Yuborildi':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'Kutilmoqda':
        return <Clock size={16} className="text-amber-500" />;
      case 'Xatolik':
        return <AlertCircle size={16} className="text-rose-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Qarzdorlik':
        return 'bg-rose-100 text-rose-700';
      case 'Davomat':
        return 'bg-amber-100 text-amber-700';
      case "E'lon":
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleSaveTemplate = async (template: SMSTemplate) => {
    try {
      const payload = { title: template.title, content: template.content, category: 'Boshqa' };
      if (templates.find((t) => t.id === template.id)) {
        await api.put(`/sms/templates/${template.id}`, payload);
      } else {
        await api.post('/sms/templates', payload);
      }
      await fetchTemplates();
    } catch {
      flash('error', 'Shablonni saqlashda xatolik');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/sms/templates/${id}`);
      await fetchTemplates();
    } catch {
      flash('error', 'Shablonni o\'chirib bo\'lmadi');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">SMS Xabarnoma</h2>
            <p className="text-sm text-slate-500 mt-1">
              Ota-onalar va o'quvchilarga SMS yuborish tizimi
            </p>
          </div>
          <div className="flex items-center gap-4">
            {notice && (
              <div
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold',
                  notice.kind === 'ok'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                )}
              >
                {notice.text}
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {(['Yangi xabar', 'Tarix', 'Shablonlar'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
                    activeTab === t
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {t === 'Tarix' ? 'Yuborilganlar tarixi' : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'Yangi xabar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    1. Qabul qiluvchini tanlang
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'individual', label: "Bitta o'quvchi", icon: User },
                      { id: 'group', label: 'Guruh', icon: Users },
                      { id: 'debtors', label: 'Qarzdorlar', icon: AlertCircle },
                      { id: 'all', label: 'Barchaga', icon: MessageSquare },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            recipientType: type.id as RecipientType,
                            recipient: '',
                            phone: '',
                            groupId: '',
                          }))
                        }
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all',
                          formData.recipientType === type.id
                            ? 'border-[#ec5b13] bg-orange-50 text-[#ec5b13]'
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                        )}
                      >
                        <type.icon size={24} />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>

                  {formData.recipientType === 'individual' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Qabul qiluvchi ismi"
                        value={formData.recipient}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, recipient: e.target.value }))
                        }
                        className="px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                      <input
                        type="text"
                        placeholder="+998 XX XXX XX XX"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                      />
                    </div>
                  )}

                  {formData.recipientType === 'group' && (
                    <select
                      value={formData.groupId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          groupId: e.target.value ? Number(e.target.value) : '',
                        }))
                      }
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
                    >
                      <option value="">Guruhni tanlang</option>
                      {groupOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      2. Xabar matni
                    </h3>
                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="text-xs font-bold text-[#ec5b13] hover:underline"
                    >
                      Shablonlardan tanlash
                    </button>
                  </div>

                  <div className="space-y-3">
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value as SMSCategory,
                        }))
                      }
                      className="w-full md:w-1/3 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
                    >
                      <option value="Boshqa">Boshqa (Oddiy xabar)</option>
                      <option value="Qarzdorlik">Qarzdorlik eslatmasi</option>
                      <option value="Davomat">Davomat (Kelmadi)</option>
                      <option value="E'lon">E'lon</option>
                    </select>

                    <div className="relative">
                      <textarea
                        value={formData.message}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, message: e.target.value }))
                        }
                        placeholder="Xabar matnini kiriting... [Ism], [Summa] belgilar avtomatik almashtiriladi."
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none font-medium text-sm resize-none h-40"
                      />
                      <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400">
                        {formData.message.length} / 160 belgi
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSendSMS}
                    disabled={
                      sending ||
                      !formData.message ||
                      (formData.recipientType === 'individual' && !formData.phone) ||
                      (formData.recipientType === 'group' && !formData.groupId)
                    }
                    className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95"
                  >
                    <Send size={18} />
                    <span>{sending ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">
                  SMS Balans
                </h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-black text-slate-900">
                    {balance?.remaining ?? 0}
                  </span>
                  <span className="text-sm font-bold text-slate-500 mb-1.5">ta SMS qoldi</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mb-6">
                  Provayder: <span className="text-slate-700">{balance?.provider ?? '—'}</span>
                </p>
                <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                  Paket sotib olish
                </button>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">
                  Ma'lumot
                </h3>
                <ul className="space-y-3 text-sm font-medium text-slate-600">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 size-1.5 rounded-full bg-[#ec5b13] flex-shrink-0"></div>
                    <p>
                      Bitta SMS uzunligi lotin alifbosida 160 belgi, kirill alifbosida 70 belgidan
                      iborat.
                    </p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 size-1.5 rounded-full bg-[#ec5b13] flex-shrink-0"></div>
                    <p>O'quvchi ismini avtomatik qo'yish uchun [Ism] tegidan foydalaning.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 size-1.5 rounded-full bg-[#ec5b13] flex-shrink-0"></div>
                    <p>Qarzdorlik summasi uchun [Summa] tegidan foydalaning.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === 'Tarix' ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="relative group flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Qabul qiluvchi yoki matn bo'yicha qidirish..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 text-sm outline-none transition-all"
                />
              </div>
              <button
                onClick={fetchHistory}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm"
              >
                <Filter size={18} />
                <span>Yangilash</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">
                      Qabul qiluvchi
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">
                      Xabar matni
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">
                      Turi
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">
                      Sana
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                        Hali hech qanday SMS yuborilmagan
                      </td>
                    </tr>
                  )}
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-slate-900">{item.recipient_name}</p>
                        <p className="text-xs text-slate-500 font-medium">{item.recipient_phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className="text-sm text-slate-600 max-w-md truncate"
                          title={item.message}
                        >
                          {item.message}
                        </p>
                        {item.error && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">{item.error}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                            getTypeColor(item.category)
                          )}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {getStatusIcon(item.status)}
                          <span className="text-xs font-bold text-slate-700">{item.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
            <SMSTemplateManager
              templates={templates}
              onSave={handleSaveTemplate}
              onDelete={handleDeleteTemplate}
            />
          </div>
        )}
      </main>

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="SMS Shablonlar"
        footer={
          <button
            onClick={() => setIsTemplateModalOpen(false)}
            className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Yopish
          </button>
        }
      >
        <div className="space-y-4">
          {templates.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Hali shablonlar mavjud emas</p>
          )}
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-[#ec5b13]/30 hover:bg-orange-50/30 transition-all group cursor-pointer"
              onClick={() => applyTemplate(template.content)}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-black text-slate-900">{template.title}</h4>
                <button className="text-xs font-bold text-[#ec5b13] opacity-0 group-hover:opacity-100 transition-opacity">
                  Tanlash
                </button>
              </div>
              <p className="text-sm text-slate-600">{template.content}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
