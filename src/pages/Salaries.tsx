import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  Users,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  UserCheck,
  Calendar,
  CreditCard,
  MoreVertical,
  CheckCircle2,
  X,
  User,
  DollarSign,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Clock
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { Modal } from '@/src/components/Modal';
import { exportToCSV } from '@/src/lib/exportUtils';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';

interface SalaryRow {
  id: string;
  name: string;
  role: string;
  amount: number;
  bonus: number;
  total: number;
  status: string;
  date: string;
  method: string;
  type: string;
  hours: number;
  rate: number;
  teacherId: string;
  period: number | null;
  percentUsed: number | null;
  paymentsTotal: number | null;
}

interface TeacherOption {
  id: string;
  name: string;
  role: string;
  hours: number;
  hourlyRate: number;
  salaryPercent: number;
  basePerStudent: number;
}

interface StudentBreakdown {
  student_id: number;
  student_name: string;
  payment_amount: number;
  course_price: number;
  base_per_student: number;
  surplus: number;
  teacher_earn: number;
}

interface CalcResult {
  teacher_name: string;
  period: number;
  period_label: string;
  base_per_student: number;
  payments_total: number;
  calculated_amount: number;
  payments_count: number;
  student_count: number;
  student_breakdowns: StudentBreakdown[];
  already_exists: boolean;
}

export const Salaries = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryRow | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [salaryToDelete, setSalaryToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    teacherId: '',
    calcType: 'fixed' as 'fixed' | 'percent',
    type: 'Asosiy maosh',
    amount: 0,
    bonus: 0,
    percent: 40,
    period: 1 as 1 | 2,
    paidStudentsTotal: 0,
    method: 'Karta orqali',
    date: new Date().toISOString().split('T')[0],
    status: 'To\'landi',
    comment: ''
  });
  const [isCalculatingPct, setIsCalculatingPct] = useState(false);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const fetchSalaries = async () => {
    try {
      const res = await api.get('/salaries');
      const mapped: SalaryRow[] = (res.data || []).map((s: any) => ({
        id: String(s.id),
        name: s.teacher_name || '',
        role: 'O\'qituvchi',
        amount: s.base_amount || 0,
        bonus: s.bonus || 0,
        total: s.total_amount || 0,
        status: s.is_paid ? 'To\'landi' : 'Kutilmoqda',
        date: s.month || '',
        method: 'Karta orqali',
        type: 'Asosiy maosh',
        hours: s.total_hours || 0,
        rate: s.total_hours > 0 ? Math.round((s.base_amount || 0) / s.total_hours) : 0,
        period: s.period ?? null,
        percentUsed: s.percent_used ?? null,
        paymentsTotal: s.payments_total ?? null,
        teacherId: String(s.teacher_id),
      }));
      setSalaries(mapped);
    } catch {
      // errors handled by interceptor
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers');
      const data = res.data.items || res.data || [];
      const mapped: TeacherOption[] = data.map((t: any) => ({
        id: String(t.id),
        name: t.full_name || t.name || '',
        role: 'O\'qituvchi',
        hours: 0,
        hourlyRate: t.hourly_rate || 0,
        salaryPercent: t.salary_percent ?? 40,
        basePerStudent: t.base_per_student ?? 120000,
      }));
      setTeachersList(mapped);
      if (mapped.length > 0) {
        setFormData(prev => ({ ...prev, teacherId: mapped[0].id }));
      }
    } catch {
      // errors handled by interceptor
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchSalaries(), fetchTeachers()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleTeacherChange = (id: string) => {
    const teacher = teachersList.find(t => t.id === id);
    if (teacher) {
      setFormData(prev => ({
        ...prev,
        teacherId: id,
        percent: teacher.salaryPercent,
        amount: teacher.hours * teacher.hourlyRate
      }));
      setCalcResult(null);
    }
  };

  const handleSave = async () => {
    const teacher = teachersList.find(t => t.id === formData.teacherId);
    if (!teacher) return;

    const currentMonth = formData.date.substring(0, 7); // "YYYY-MM"
    const payload = {
      teacher_id: Number(formData.teacherId),
      month: currentMonth,
      base_amount: Number(formData.amount),
      bonus: Number(formData.bonus),
      total_hours: 0,
      total_amount: Number(formData.amount) + Number(formData.bonus),
      period: formData.calcType === 'percent' ? formData.period : null,
      percent_used: formData.calcType === 'percent' ? formData.percent : null,
      payments_total: formData.calcType === 'percent' ? formData.paidStudentsTotal : null,
    };

    try {
      if (editingSalary) {
        await api.put(`/salaries/${editingSalary.id}`, {
          base_amount: payload.base_amount,
          bonus: payload.bonus,
          total_amount: payload.total_amount,
          is_paid: formData.status === 'To\'landi',
        });
      } else {
        await api.post('/salaries', payload);
      }
      await fetchSalaries();
      setIsModalOpen(false);
      setEditingSalary(null);
      resetForm();
    } catch {
      // errors handled by interceptor
    }
  };

  const resetForm = () => {
    setFormData({
      teacherId: teachersList[0]?.id || '',
      calcType: 'fixed',
      type: 'Asosiy maosh',
      amount: 0,
      bonus: 0,
      percent: 0,
      period: 1,
      paidStudentsTotal: 0,
      method: 'Karta orqali',
      date: new Date().toISOString().split('T')[0],
      status: 'To\'landi',
      comment: ''
    });
  };

  const calculatePercentSalary = async () => {
    if (!formData.teacherId) return;
    setIsCalculatingPct(true);
    setCalcResult(null);
    try {
      const month = formData.date.substring(0, 7);
      const res = await api.post('/salaries/calculate', {
        teacher_id: Number(formData.teacherId),
        month,
        period: formData.period,
        percent: formData.percent,
      });
      const result: CalcResult = res.data;
      setCalcResult(result);
      setFormData(prev => ({
        ...prev,
        paidStudentsTotal: result.payments_total,
        amount: result.calculated_amount,
      }));
    } catch {
      // errors handled by interceptor
    } finally {
      setIsCalculatingPct(false);
    }
  };

  const handleEdit = (salary: SalaryRow) => {
    setEditingSalary(salary);
    setFormData({
      teacherId: salary.teacherId || teachersList[0]?.id || '',
      calcType: 'fixed',
      type: salary.type,
      amount: salary.amount,
      bonus: salary.bonus,
      percent: 0,
      period: 1,
      paidStudentsTotal: 0,
      method: salary.method,
      date: salary.date,
      status: salary.status,
      comment: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSalaryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (salaryToDelete) {
      try {
        await api.delete(`/salaries/${salaryToDelete}`);
        await fetchSalaries();
      } catch {
        // errors handled by interceptor
      }
      setIsDeleteModalOpen(false);
      setSalaryToDelete(null);
    }
  };

  const filteredSalaries = salaries.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMonth = monthFilter === 'all' || (s.date || '').startsWith(monthFilter);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesMonth && matchesStatus;
  });

  const availableMonths = Array.from(new Set(salaries.map(s => (s.date || '').substring(0, 7)).filter(Boolean))).sort().reverse();

  const totalFund = filteredSalaries.reduce((acc, s) => acc + s.total, 0);
  const paidAmount = filteredSalaries.filter(s => s.status === 'To\'landi').reduce((acc, s) => acc + s.total, 0);
  const pendingAmount = totalFund - paidAmount;

  const currentStats = [
    { label: 'Oylik ish haqi fondi', value: totalFund.toLocaleString(), trend: '+5.2%', icon: Wallet, color: 'bg-blue-100 text-blue-600' },
    { label: 'To\'langan', value: paidAmount.toLocaleString(), trend: `${Math.round((paidAmount / totalFund) * 100)}%`, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Qolgan', value: pendingAmount.toLocaleString(), trend: `${Math.round((pendingAmount / totalFund) * 100)}%`, icon: TrendingUp, color: 'bg-orange-100 text-[#ec5b13]' },
    { label: 'Xodimlar soni', value: teachersList.length.toString(), trend: 'Faol', icon: Users, color: 'bg-slate-100 text-slate-600' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Ish haqi boshqaruvi</h2>
            <p className="text-sm text-slate-500 mt-1">O'qituvchi va xodimlar maoshlarini nazorat qilish</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => exportToCSV(filteredSalaries, 'ish_haqi_hisoboti')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm"
            >
              <Download size={18} />
              <span>Eksport</span>
            </button>
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
              >
                <Plus size={18} />
                <span>Maosh hisoblash</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentStats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-xl", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-50 text-slate-400 uppercase tracking-wider">
                  {stat.trend}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-bold">{stat.label}</p>
              <h3 className="text-2xl font-black mt-1 text-slate-900">{stat.value} <span className="text-xs font-normal text-slate-400">UZS</span></h3>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Xodim ismi bo'yicha qidirish"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">Barcha oylar</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">Barcha holatlar</option>
              <option value="To'landi">To'landi</option>
              <option value="Kutilmoqda">Kutilmoqda</option>
            </select>
            <button
              onClick={() => { setSearchQuery(''); setMonthFilter('all'); setStatusFilter('all'); }}
              title="Filtrlarni tozalash"
              className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Auto-calc info banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          Yangi formula: har bir to'lagan o'quvchi uchun o'qituvchiga asosiy summa + kurs narxidan ortiqcha to'lovning 1/3 qismi. Maoshlar avtomatik yangilanadi.
        </div>

        {/* Salaries Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Xodim</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Lavozim</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Hisoblangan</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Bonus</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Jami</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Holati</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSalaries.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{s.name}</p>
                        {s.period ? (
                          <p className="text-[10px] text-orange-500 font-bold uppercase">
                            {s.period === 1 ? '1–14' : '15–oxiri'} · formula asosida
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{s.paymentsTotal ? `${s.paymentsTotal.toLocaleString()} UZS to'lov` : `${s.hours} soat`}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{s.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{s.amount.toLocaleString()} UZS</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-500">+{s.bonus.toLocaleString()} UZS</td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">{s.total.toLocaleString()} UZS</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      s.status === 'To\'landi' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(s)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Salary Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSalary(null);
          resetForm();
        }}
        title={editingSalary ? "Maoshni tahrirlash" : "Yangi maosh hisoblash"}
        footer={
          <>
            <button onClick={() => {
              setIsModalOpen(false);
              setEditingSalary(null);
              resetForm();
            }} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase">Hisoblash turi</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, calcType: 'fixed' }))}
                className={cn(
                  "py-2.5 rounded-lg text-sm font-bold transition-all",
                  formData.calcType === 'fixed' ? "bg-white text-[#ec5b13] shadow-sm" : "text-slate-500"
                )}
              >
                Qo'lda kiritish
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, calcType: 'percent' }))}
                className={cn(
                  "py-2.5 rounded-lg text-sm font-bold transition-all",
                  formData.calcType === 'percent' ? "bg-white text-[#ec5b13] shadow-sm" : "text-slate-500"
                )}
              >
                Formula asosida
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Xodimni tanlang</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select 
                value={formData.teacherId}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                {teachersList.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">To'lov turi</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select 
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option>Asosiy maosh</option>
                <option>Bonus</option>
                <option>Avans</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Hisoblangan summa (UZS)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: 4,500,000" 
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              {teachersList.find(t => t.id === formData.teacherId)?.hourlyRate.toLocaleString() || 0} UZS/soat
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Bonus (UZS)</label>
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="number"
                value={formData.bonus}
                onChange={(e) => setFormData(prev => ({ ...prev, bonus: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: 500,000"
              />
            </div>
          </div>
          {formData.calcType === 'percent' && (
            <div className="md:col-span-2 p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
              <div className="flex items-start justify-between">
                <label className="text-xs font-black text-orange-700 uppercase">Formula asosida hisoblash</label>
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                  {(teachersList.find(t => t.id === formData.teacherId)?.basePerStudent ?? 120000).toLocaleString()} UZS/o'quvchi
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg text-[11px] text-slate-600 font-bold space-y-1 border border-orange-100">
                <p className="text-slate-500">Formula: <span className="text-slate-800">Asosiy ({(teachersList.find(t => t.id === formData.teacherId)?.basePerStudent ?? 120000).toLocaleString()} UZS) + ortiqcha to'lovning 1/3 qismi</span></p>
                <p className="text-slate-400">Misol: o'quvchi 400 000 UZS to'lasa, kurs narxi 350 000 → ortiqcha 50 000 → o'qituvchi {((teachersList.find(t => t.id === formData.teacherId)?.basePerStudent ?? 120000) + Math.floor(50000/3)).toLocaleString()} UZS oladi</p>
              </div>

              {/* Period selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">To'lov davri</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, period: 1 })); setCalcResult(null); }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-black border transition-all",
                      formData.period === 1
                        ? "bg-[#ec5b13] text-white border-[#ec5b13]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    )}
                  >
                    1–14 (1-yarmi)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, period: 2 })); setCalcResult(null); }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-black border transition-all",
                      formData.period === 2
                        ? "bg-[#ec5b13] text-white border-[#ec5b13]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    )}
                  >
                    15–oxiri (2-yarmi)
                  </button>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={calculatePercentSalary}
                  disabled={isCalculatingPct || !formData.teacherId}
                  className="w-full py-2.5 bg-[#ec5b13] hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
                >
                  {isCalculatingPct ? 'Hisoblanmoqda...' : 'Hisoblash'}
                </button>
              </div>

              {/* Calculation result breakdown */}
              {calcResult && (
                <div className={cn(
                  "rounded-xl border text-xs font-bold overflow-hidden",
                  calcResult.already_exists ? "border-yellow-200" : "border-green-200"
                )}>
                  <div className={cn(
                    "px-4 py-2.5 flex items-center justify-between",
                    calcResult.already_exists ? "bg-yellow-50" : "bg-green-50"
                  )}>
                    <div className="space-y-0.5">
                      {calcResult.already_exists && (
                        <p className="text-yellow-700 font-black">⚠️ Bu davr uchun oylik allaqachon mavjud</p>
                      )}
                      <p className={calcResult.already_exists ? "text-yellow-700" : "text-green-700"}>
                        📅 {calcResult.period_label} · {calcResult.student_count} o'quvchi to'ladi
                      </p>
                      <p className={calcResult.already_exists ? "text-yellow-700" : "text-green-700"}>
                        💰 Jami to'lovlar: {calcResult.payments_total.toLocaleString()} UZS
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">O'qituvchi oladi</p>
                      <p className="text-2xl font-black text-slate-900">{calcResult.calculated_amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">UZS</p>
                    </div>
                  </div>
                  {calcResult.student_breakdowns.length > 0 && (
                    <div className="bg-white">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-3 py-2 text-left font-black text-slate-400 uppercase">O'quvchi</th>
                            <th className="px-3 py-2 text-right font-black text-slate-400 uppercase">To'lov</th>
                            <th className="px-3 py-2 text-right font-black text-slate-400 uppercase">Kurs narxi</th>
                            <th className="px-3 py-2 text-right font-black text-slate-400 uppercase">O'qituvchiga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {calcResult.student_breakdowns.map(b => (
                            <tr key={b.student_id} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-slate-700">{b.student_name}</td>
                              <td className="px-3 py-1.5 text-right text-slate-600">{b.payment_amount.toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right text-slate-400">{b.course_price.toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right font-black text-emerald-600">
                                {b.teacher_earn.toLocaleString()}
                                {b.surplus > 0 && <span className="text-[9px] text-orange-500 ml-1">+{Math.floor(b.surplus/3).toLocaleString()}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">To'lov usuli</label>
            <select 
              value={formData.method}
              onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
            >
              <option>Karta orqali</option>
              <option>Naqd pul</option>
              <option>Bank o'tkazmasi</option>
              <option>Payme</option>
              <option>Click</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Sana</label>
            <input 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
            >
              <option>To'landi</option>
              <option>Kutilmoqda</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Izoh</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-300" size={18} />
              <textarea 
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm min-h-[100px]" 
                placeholder="To'lov haqida qo'shimcha ma'lumot..."
              ></textarea>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="To'lovni o'chirish"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">Ha, o'chirilsin</button>
          </>
        }
      >
        <div className="text-center space-y-4">
          <div className="size-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Ishonchingiz komilmi?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Siz ushbu maosh to'lovi ma'lumotlarini o'chirmoqchisiz. Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
