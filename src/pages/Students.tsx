import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  MessageSquare,
  Snowflake,
  Sun,
  X,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { cn, getPaymentStatus, PAYMENT_STATUS_META, PaymentStatus } from '@/src/lib/utils';
import { encodeId } from '@/src/lib/hashId';
import { Student, Group } from '@/src/types';
import { Modal } from '@/src/components/Modal';
import { SkeletonTable } from '@/src/components/SkeletonTable';
import { ErrorState } from '@/src/components/ErrorState';
import { StudentFormModal } from '@/src/components/StudentFormModal';
import { useAuth } from '@/src/contexts/AuthContext';
import api from '@/src/lib/api';
import * as XLSX from 'xlsx';

type StatusFilter = '' | 'Faol' | 'Muzlatilgan' | 'Kutishda' | 'Ketgan';
type DebtFilter = '' | 'paid' | 'unpaid' | 'partial';

const SEARCH_DEBOUNCE_MS = 300;

const mapStudent = (s: Record<string, unknown>): Student => ({
  id: String(s.id),
  name: s.name as string,
  phone: s.phone as string,
  group: ((s.group_names as string[]) || []).join(', '),
  status: (s.status as Student['status']) ?? 'Faol',
  debt: (s.debt as number) ?? 0,
  paid: (s.paid as number) ?? 0,
  isOverdue: (s.is_overdue as boolean) ?? false,
  paymentDay: (s.payment_day as number) ?? undefined,
  attendance: 0,
  birthDate: (s.birth_date as string) || '',
  gender: (s.gender as Student['gender']) ?? 'Erkak',
  address: (s.address as string) || '',
  parentName: (s.parent_name as string) || '',
  parentPhone: (s.parent_phone as string) || '',
  avatar: (s.avatar as string) || undefined,
});

export const Students = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [studentList, setStudentList] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [groupOptions, setGroupOptions] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [studentToFreeze, setStudentToFreeze] = useState<Student | null>(null);
  const [isFreezeSubmitting, setIsFreezeSubmitting] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = (searchParams.get('status') || '') as StatusFilter;
  const groupFilter = searchParams.get('group_id') || '';
  const debtFilter = (searchParams.get('debt') || '') as DebtFilter;

  // Local input state for debounced search
  const [searchInput, setSearchInput] = useState(searchQuery);
  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === searchQuery) return;
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set('search', searchInput);
      else next.delete('search');
      next.set('page', '1');
      setSearchParams(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (groupFilter) params.group_id = groupFilter;
      if (debtFilter) params.debt_status = debtFilter;
      const res = await api.get('/students', { params });
      setStudentList(res.data.items.map(mapStudent));
      setTotalStudents(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O'quvchilarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupOptions = async () => {
    try {
      const res = await api.get('/groups');
      setGroupOptions(res.data.map((g: Record<string, unknown>) => ({
        id: String(g.id),
        name: g.name as string,
        course: (g.course_name as string) || '',
        level: (g.level as string) || '',
        teacher: (g.teacher_name as string) || '',
        room: (g.room as string) || '',
        schedule: (g.schedule as string) || '',
        time: (g.time as string) || '',
        capacity: (g.capacity as number) ?? 0,
        studentsCount: (g.students_count as number) ?? 0,
        status: (g.status as Group['status']) ?? 'Faol',
      })));
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, searchQuery, statusFilter, groupFilter, debtFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchGroupOptions();
  }, []);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    setSearchParams(next);
    setSearchInput('');
  };

  const hasActiveFilters = useMemo(
    () => Boolean(searchQuery || statusFilter || groupFilter || debtFilter),
    [searchQuery, statusFilter, groupFilter, debtFilter]
  );

  const handleAddClick = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const handleFreezeClick = (student: Student) => {
    setStudentToFreeze(student);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await api.delete(`/students/${studentToDelete.id}`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch {
      // intercepted
    }
  };

  const confirmFreeze = async () => {
    if (!studentToFreeze) return;
    const target = studentToFreeze;
    const previousStatus = target.status;
    const newStatus: Student['status'] = previousStatus === 'Muzlatilgan' ? 'Faol' : 'Muzlatilgan';

    // Optimistic update
    setStudentList((list) => list.map((s) => (s.id === target.id ? { ...s, status: newStatus } : s)));
    setIsFreezeSubmitting(true);
    try {
      await api.put(`/students/${target.id}`, { status: newStatus });
      setStudentToFreeze(null);
    } catch (err: unknown) {
      // Rollback
      setStudentList((list) => list.map((s) => (s.id === target.id ? { ...s, status: previousStatus } : s)));
      const message = err instanceof Error ? err.message : "Holatni o'zgartirishda xatolik";
      window.alert(message);
    } finally {
      setIsFreezeSubmitting(false);
    }
  };

  const handleFormSuccess = () => {
    fetchStudents();
  };

  const [isExporting, setIsExporting] = useState(false);

  // Prefix any cell starting with =, +, -, @ (formula triggers in Excel/Sheets)
  // with a leading apostrophe so it renders as text instead of executing.
  const sanitizeCell = (value: unknown): unknown => {
    if (typeof value !== 'string' || value.length === 0) return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch ALL students across pages, applying current filters so the export
      // matches what the admin sees on screen.
      // Backend caps limit at 100; loop pages below to collect everything.
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (groupFilter) params.group_id = groupFilter;
      if (debtFilter) params.debt_status = debtFilter;

      const collected: Student[] = [];
      let nextPage = 1;
      let totalPagesLocal = 1;
      do {
        params.page = nextPage;
        const res = await api.get('/students', { params });
        const pageItems = (res.data.items || []).map(mapStudent);
        collected.push(...pageItems);
        totalPagesLocal = res.data.pages || 1;
        nextPage += 1;
      } while (nextPage <= totalPagesLocal);

      const rows = collected.map((s, i) => {
        const ps = getPaymentStatus(s.debt, s.paid);
        return {
          "#": i + 1,
          "Ism": sanitizeCell(s.name),
          "Telefon": sanitizeCell(s.phone),
          "Jinsi": sanitizeCell(s.gender),
          "Tug'ilgan sana": sanitizeCell(s.birthDate),
          "Manzil": sanitizeCell(s.address),
          "Guruh": sanitizeCell(s.group),
          "Status": sanitizeCell(s.status),
          "To'lov holati": PAYMENT_STATUS_META[ps].label,
          "Qarz (UZS)": s.debt,
          "To'langan (UZS)": s.paid,
          "Ota-onasi": sanitizeCell(s.parentName),
          "Ota-ona telefoni": sanitizeCell(s.parentPhone),
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      // Reasonable column widths
      ws['!cols'] = [
        { wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 8 }, { wch: 14 },
        { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "O'quvchilar");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `oquvchilar_${today}.xlsx`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Eksport qilishda xatolik";
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const renderDebtBadge = (debt: number, paid: number) => {
    const status: PaymentStatus = getPaymentStatus(debt, paid);
    const meta = PAYMENT_STATUS_META[status];
    return (
      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider", meta.className)}>
        {meta.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">O'quvchilar ro'yxati</h2>
            <p className="text-sm text-slate-500 mt-1">Jami {totalStudents} ta o'quvchi tizimda mavjud</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-60"
              title="Barcha o'quvchilarni Excel faylga yuklab olish"
            >
              <Download size={20} />
              <span>{isExporting ? 'Yuklanmoqda...' : 'Excel yuklab olish'}</span>
            </button>
            {isAdmin && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95"
              >
                <Plus size={20} />
                <span>O'quvchi qo'shish</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={20} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ism yoki telefon bo'yicha qidirish"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-400 text-sm outline-none transition-all"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold text-slate-600 text-sm"
              >
                <X size={16} />
                <span>Filtrlarni tozalash</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-orange-500/20 cursor-pointer outline-none"
            >
              <option value="">Barcha holatlar</option>
              <option value="Faol">Faol</option>
              <option value="Muzlatilgan">Muzlatilgan</option>
              <option value="Kutishda">Kutishda</option>
              <option value="Ketgan">Ketgan</option>
            </select>

            <select
              value={groupFilter}
              onChange={(e) => updateParam('group_id', e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-orange-500/20 cursor-pointer outline-none"
            >
              <option value="">Barcha guruhlar</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={debtFilter}
              onChange={(e) => updateParam('debt', e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-orange-500/20 cursor-pointer outline-none"
            >
              <option value="">Barcha to'lovlar</option>
              <option value="paid">To'langan</option>
              <option value="partial">Qisman to'langan</option>
              <option value="unpaid">Qarzdor</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStudents} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Ism</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Telefon</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Guruh</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Qarzdorlik</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        O'quvchilar topilmadi
                      </td>
                    </tr>
                  ) : (
                    studentList.map((s) => (
                      <tr key={s.id} className={cn(
                        "transition-colors group",
                        s.status === 'Muzlatilgan' ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/50"
                      )}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/students/${encodeId(s.id)}`)}
                            className="flex items-center gap-3 text-left hover:text-[#ec5b13] transition-colors"
                          >
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.name} className="size-9 rounded-full object-cover" />
                            ) : (
                              <div className={cn(
                                "size-9 rounded-full flex items-center justify-center text-xs font-black",
                                s.gender === 'Erkak' ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600"
                              )}>
                                {s.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                            )}
                            <span className="font-bold text-sm text-slate-900 group-hover:text-[#ec5b13]">{s.name}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{s.phone}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">
                          {s.group || <span className="text-slate-400 font-medium">Guruhsiz</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            s.status === 'Faol' ? "bg-emerald-100 text-emerald-700" :
                            s.status === 'Muzlatilgan' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-sm font-black", s.debt > 0 || s.isOverdue ? "text-red-500" : "text-slate-900")}>
                              {s.debt.toLocaleString()} UZS
                            </span>
                            {renderDebtBadge(s.debt, s.paid)}
                            {s.isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 border border-red-200">
                                Qarzdor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => navigate(`/sms?phone=${encodeURIComponent(s.phone)}&name=${encodeURIComponent(s.name)}`)}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                                title="SMS yuborish"
                              >
                                <MessageSquare size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/students/${encodeId(s.id)}`)}
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                              title="Profilni ko'rish"
                            >
                              <Eye size={16} />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleEditClick(s)}
                                  className="p-2 bg-slate-50 text-slate-400 hover:bg-[#ec5b13] hover:text-white rounded-xl transition-all"
                                  title="Tahrirlash"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleFreezeClick(s)}
                                  className={cn(
                                    "p-2 rounded-xl transition-all",
                                    s.status === 'Muzlatilgan'
                                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                      : "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white"
                                  )}
                                  title={s.status === 'Muzlatilgan' ? "Faollashtirish" : "Muzlatish"}
                                >
                                  {s.status === 'Muzlatilgan' ? <Sun size={16} /> : <Snowflake size={16} />}
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(s)}
                                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                                  title="O'chirish"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
              <p className="text-xs text-slate-500 font-bold">
                Jami {totalStudents} tadan {totalStudents === 0 ? 0 : (page - 1) * 20 + 1}-{Math.min(page * 20, totalStudents)} gacha ko'rsatilmoqda
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('page', Math.max(1, page - 1).toString());
                    setSearchParams(next);
                  }}
                  disabled={page === 1}
                  className="size-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition-all text-slate-400 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button className="size-9 flex items-center justify-center rounded-xl bg-[#ec5b13] text-white font-black text-sm shadow-md shadow-orange-200">{page}</button>
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('page', (page + 1).toString());
                    setSearchParams(next);
                  }}
                  disabled={page >= totalPages}
                  className="size-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition-all text-slate-400 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingStudent={editingStudent}
        groupOptions={groupOptions}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="O'quvchini o'chirish"
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
              Siz <span className="font-bold text-slate-900">{studentToDelete?.name}</span> o'quvchini tizimdan o'chirmoqchisiz. Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
        </div>
      </Modal>

      {/* Freeze Confirmation */}
      <Modal
        isOpen={Boolean(studentToFreeze)}
        onClose={() => !isFreezeSubmitting && setStudentToFreeze(null)}
        title={studentToFreeze?.status === 'Muzlatilgan' ? "O'quvchini faollashtirish" : "O'quvchini muzlatish"}
        footer={
          <>
            <button
              onClick={() => setStudentToFreeze(null)}
              disabled={isFreezeSubmitting}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-70"
            >
              Bekor qilish
            </button>
            <button
              onClick={confirmFreeze}
              disabled={isFreezeSubmitting}
              className={cn(
                "flex-1 py-3 text-white rounded-2xl text-sm font-bold transition-all shadow-lg disabled:opacity-70",
                studentToFreeze?.status === 'Muzlatilgan'
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
              )}
            >
              {isFreezeSubmitting ? 'Bajarilmoqda...' : (studentToFreeze?.status === 'Muzlatilgan' ? 'Faollashtirish' : 'Muzlatish')}
            </button>
          </>
        }
      >
        <div className="text-center space-y-4">
          <div className={cn(
            "size-16 rounded-full flex items-center justify-center mx-auto",
            studentToFreeze?.status === 'Muzlatilgan' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>
            {studentToFreeze?.status === 'Muzlatilgan' ? <Sun size={32} /> : <Snowflake size={32} />}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Ishonchingiz komilmi?</h3>
            <p className="text-sm text-slate-500 mt-1">
              {studentToFreeze?.status === 'Muzlatilgan' ? (
                <><span className="font-bold text-slate-900">{studentToFreeze?.name}</span> qayta faol ro'yxatga qo'shiladi.</>
              ) : (
                <><span className="font-bold text-slate-900">{studentToFreeze?.name}</span> muzlatiladi. Muzlatilgan o'quvchilar avtomatik SMS, davomat hisoboti va faol ro'yxatdan chiqariladi.</>
              )}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
