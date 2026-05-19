import React, { useEffect, useState } from 'react';
import { MessageSquare, Loader2, Send, Clock, Check, X, Users } from 'lucide-react';
import api from '../lib/api';

interface SmsMessage {
  id: number;
  recipient_type?: string;
  message: string;
  status: string;
  sent_at?: string;
  created_at?: string;
  recipients_count?: number;
}

interface Group {
  id: number;
  name: string;
}

const STATUS_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  'sent':     { cls: 'bg-emerald-50 text-emerald-600', icon: <Check size={10} /> },
  'pending':  { cls: 'bg-amber-50 text-amber-500', icon: <Clock size={10} /> },
  'failed':   { cls: 'bg-rose-50 text-rose-500', icon: <X size={10} /> },
  'Yuborildi': { cls: 'bg-emerald-50 text-emerald-600', icon: <Check size={10} /> },
  'Kutilmoqda': { cls: 'bg-amber-50 text-amber-500', icon: <Clock size={10} /> },
};

export const SMS = () => {
  const [tab, setTab] = useState<'send' | 'history'>('send');
  const [history, setHistory] = useState<SmsMessage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recipientType, setRecipientType] = useState('all');
  const [groupId, setGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      try {
        const res = await api.get('/groups');
        setGroups(Array.isArray(res.data) ? res.data : (res.data?.items ?? []));
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/sms');
      setHistory(Array.isArray(res.data) ? res.data : (res.data?.items ?? []));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!message.trim()) {
      setError("Xabar matni kiritilmagan");
      return;
    }
    setSending(true);
    try {
      await api.post('/sms/send', {
        recipient_type: recipientType,
        group_id: recipientType === 'group' ? Number(groupId) : undefined,
        message,
      });
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail ?? "Xatolik yuz berdi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
          <MessageSquare size={20} className="text-sky-500" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">SMS xabarlar</h1>
          <p className="text-sm text-slate-400">Yuborish va tarix</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('send')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'send' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Yuborish
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Tarix
        </button>
      </div>

      {tab === 'send' ? (
        <form onSubmit={handleSend} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
          {sent && (
            <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <Check size={14} /> Xabar muvaffaqiyatli yuborildi!
            </div>
          )}

          {/* Recipient type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Qabul qiluvchilar</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Barcha o\'quvchilar' },
                { value: 'group', label: 'Guruh bo\'yicha' },
                { value: 'individual', label: 'Alohida' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecipientType(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    recipientType === opt.value
                      ? 'bg-[#ec5b13] text-white border-[#ec5b13]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group selector */}
          {recipientType === 'group' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Guruhni tanlang</label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                disabled={loading}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              >
                <option value="">Tanlang...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Xabar matni *</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={500}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              placeholder="Xabar matnini kiriting..."
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{message.length}/500</p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-[#ec5b13] text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Yuborish
          </button>
        </form>
      ) : (
        historyLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Yuklanmoqda...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p>Hozircha xabarlar yo'q</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-50">
              {history.map(msg => {
                const stStyle = STATUS_STYLE[msg.status] ?? { cls: 'bg-slate-100 text-slate-500', icon: null };
                const dateStr = msg.sent_at ?? msg.created_at;
                return (
                  <div key={msg.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${stStyle.cls}`}>
                          {stStyle.icon}
                          {msg.status}
                        </span>
                        {msg.recipients_count !== undefined && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Users size={11} /> {msg.recipients_count}
                          </span>
                        )}
                      </div>
                      {dateStr && (
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(dateStr).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{msg.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};
