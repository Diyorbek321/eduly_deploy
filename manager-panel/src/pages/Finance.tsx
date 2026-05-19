import React, { useEffect, useState } from 'react';
import {
  FileText, Wallet, AlertTriangle, CheckCircle2,
  XCircle, CalendarClock, RefreshCw, Loader2, TrendingUp,
} from 'lucide-react';
import api from '../lib/api';

interface FinanceHealth {
  month: string;
  invoices_generated: number;
  invoices_paid: number;
  collection_rate: number;
  overdue_invoices: number;
  active_teachers: number;
  teachers_with_salary: number;
  unpaid_salary_count: number;
  total_debt: number;
  total_active_students: number;
  next_invoice_date: string;
  next_salary_date: string;
}

function Ring({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative size-20">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${Math.min(pct, 100)} ${100 - Math.min(pct, 100)}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-black text-slate-900">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export const Finance = () => {
  const [health, setHealth] = useState<FinanceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/health');
      setHealth(res.data?.data ?? res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const trigger = async (endpoint: string) => {
    setAction(endpoint);
    try {
      await api.post(`/finance/${endpoint}`);
      await load();
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
      </div>
    );
  }

  if (!health) return null;

  const rateColor = health.collection_rate >= 80 ? '#10b981' : health.collection_rate >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Moliya holati</h1>
          <p className="text-sm text-slate-400 mt-0.5">{health.month} — joriy oy</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => trigger('generate-invoices')} disabled={!!action}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white disabled:opacity-50">
            {action === 'generate-invoices' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Hisob-faktura
          </button>
          <button type="button" onClick={() => trigger('auto-calc-salaries')} disabled={!!action}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white disabled:opacity-50">
            {action === 'auto-calc-salaries' ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
            Ish haqi
          </button>
        </div>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Collection rate */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-5">
          <Ring pct={health.collection_rate} color={rateColor} />
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">To'lov darajasi</p>
            <p className="text-2xl font-black" style={{ color: rateColor }}>{health.collection_rate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">{health.invoices_paid} / {health.invoices_generated} hisob-faktura</p>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <FileText size={17} className="text-violet-500" />
            </div>
            <p className="font-bold text-slate-900">Hisob-fakturalar</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Yaratilgan</span>
              <span className="font-bold text-slate-900">{health.invoices_generated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">To'langan</span>
              <span className="font-bold text-emerald-600">{health.invoices_paid}</span>
            </div>
            {health.overdue_invoices > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 font-medium">Muddati o'tgan</span>
                <span className="font-bold text-amber-600">{health.overdue_invoices}</span>
              </div>
            )}
          </div>
        </div>

        {/* Salary status */}
        <div className={`rounded-2xl border p-6 ${health.unpaid_salary_count > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`size-9 rounded-xl flex items-center justify-center ${health.unpaid_salary_count > 0 ? 'bg-rose-100' : 'bg-emerald-50'}`}>
              <Wallet size={17} className={health.unpaid_salary_count > 0 ? 'text-rose-500' : 'text-emerald-500'} />
            </div>
            <p className="font-bold text-slate-900">Ish haqi</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Faol o'qituvchilar</span>
              <span className="font-bold text-slate-900">{health.active_teachers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hisoblangan</span>
              <span className="font-bold text-emerald-600">{health.teachers_with_salary}</span>
            </div>
            {health.unpaid_salary_count > 0 && (
              <div className="flex justify-between">
                <span className="text-rose-600 font-medium">Hisoblanmagan</span>
                <span className="font-bold text-rose-600">{health.unpaid_salary_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Debt */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle size={17} className="text-rose-400" />
            </div>
            <p className="font-bold text-slate-900">Qarzdorlik</p>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {(health.total_debt / 1_000_000).toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">M UZS</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">{health.total_active_students} ta faol o'quvchi</p>
        </div>

        {/* Overdue status */}
        <div className={`rounded-2xl border p-6 ${health.overdue_invoices > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-4">
            {health.overdue_invoices > 0
              ? <XCircle size={20} className="text-amber-500" />
              : <CheckCircle2 size={20} className="text-emerald-500" />}
            <p className="font-bold text-slate-900">
              {health.overdue_invoices > 0 ? "Muddati o'tgan" : 'Barchasi tartibda'}
            </p>
          </div>
          <p className="text-2xl font-black" style={{ color: health.overdue_invoices > 0 ? '#d97706' : '#10b981' }}>
            {health.overdue_invoices}
          </p>
          <p className="text-xs text-slate-400 mt-1">muddati o'tgan hisob-faktura</p>
        </div>

        {/* Next runs */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-sky-50 flex items-center justify-center">
              <CalendarClock size={17} className="text-sky-500" />
            </div>
            <p className="font-bold text-slate-900">Keyingi avtomatik</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Hisob-faktura</span>
              <span className="font-bold text-slate-900">{health.next_invoice_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ish haqi</span>
              <span className="font-bold text-slate-900">{health.next_salary_date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
