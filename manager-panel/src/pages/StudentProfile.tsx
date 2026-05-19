import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Clock,
  BookOpen,
  User,
  AlertCircle,
  Lock,
  Snowflake,
  Sun,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { cn, getPaymentStatus, PAYMENT_STATUS_META } from '../lib/utils';
import { decodeId } from '../lib/hashId';

import { Student, Group } from '../types';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { StudentFormModal } from '../components/StudentFormModal';
import { Modal } from '../components/Modal';

interface GroupInfo {
  id: number;
  name: string;
  teacher_name: string;
  schedule: string;
  time: string;
  status: string;
}

interface PaymentInfo {
  id: number;
  amount: number;
  method: string;
  status: string;
  date: string;
}

interface AttendanceInfo {
  id: number;
  date: string;
  group_name: string;
  status: string;
  note: string | null;
}

export const StudentProfile = () => {
  const navigate = useNavigate();
  const { id: hashedId } = useParams<{ id: string }>();
  const id = hashedId ? decodeId(hashedId) : undefined;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('Umumiy');
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [attendances, setAttendances] = useState<AttendanceInfo[]>([]);
  const [groupOptions, setGroupOptions] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);
  const [isFreezeSubmitting, setIsFreezeSubmitting] = useState(false);

  const fetchStudent = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Teachers have read-only access to student details and may NOT see payments;
      // skip the payments call so we don't trigger a 403 in the network log.
      const paymentsPromise = isAdmin
        ? api.get(`/students/${id}/payments`)
        : Promise.resolve({ data: [] as PaymentInfo[] });
      const [studentRes, groupsRes, paymentsRes, attendancesRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/students/${id}/groups`),
        paymentsPromise,
        api.get(`/students/${id}/attendances`),
      ]);
      const s = studentRes.data;
      setStudent({
        id: String(s.id),
        name: s.name,
        phone: s.phone,
        group: '',
        status: s.status ?? 'Faol',
        debt: s.debt ?? 0,
        paid: s.paid ?? 0,
        attendance: 0,
        birthDate: s.birth_date || '',
        gender: s.gender ?? 'Erkak',
        address: s.address || '',
        parentName: s.parent_name || '',
        parentPhone: s.parent_phone || '',
        avatar: s.avatar || undefined,
      });
      setGroups(groupsRes.data);
      setPayments(paymentsRes.data);
      setAttendances(attendancesRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O'quvchi ma'lumotlarini yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/groups').then((res) => {
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
    }).catch(() => undefined);
  }, [isAdmin]);

  const handleFreezeConfirm = async () => {
    if (!student) return;
    const previous = student.status;
    const next: Student['status'] = previous === 'Muzlatilgan' ? 'Faol' : 'Muzlatilgan';
    setStudent({ ...student, status: next }); // optimistic
    setIsFreezeSubmitting(true);
    try {
      await api.put(`/students/${student.id}`, { status: next });
      setIsFreezeOpen(false);
    } catch (err: unknown) {
      setStudent({ ...student, status: previous }); // rollback
      const message = err instanceof Error ? err.message : "Holatni o'zgartirishda xatolik";
      window.alert(message);
    } finally {
      setIsFreezeSubmitting(false);
    }
  };

  const tabs = isAdmin
    ? ['Umumiy', 'Davomat', "To'lovlar", 'Uyga vazifa', 'Izohlar']
    : ['Umumiy', 'Davomat', 'Uyga vazifa', 'Izohlar'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Davomat':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Oxirgi davomat holati</h3>
            <div className="space-y-3">
              {attendances.length === 0 ? (
                <p className="text-sm text-slate-500">Davomat ma'lumotlari topilmadi</p>
              ) : attendances.map((item) => {
                const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                  present: { label: 'Keldi', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  absent: { label: 'Kelmadi', color: 'text-rose-500', bg: 'bg-rose-50' },
                  late: { label: 'Kechikdi', color: 'text-amber-500', bg: 'bg-amber-50' },
                  excused: { label: 'Sababli', color: 'text-blue-500', bg: 'bg-blue-50' },
                };
                const s = statusMap[item.status] ?? { label: item.status, color: 'text-slate-500', bg: 'bg-slate-50' };
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.date}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.group_name}</p>
                      </div>
                    </div>
                    <span className={cn("text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider", s.bg, s.color)}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'To\'lovlar':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">To'lovlar tarixi</h3>
            <div className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">To'lovlar topilmadi</p>
              ) : payments.map((item) => {
                const statusMap: Record<string, { label: string; className: string }> = {
                  'Muvaffaqiyatli': { label: 'Muvaffaqiyatli', className: 'text-emerald-500 bg-emerald-50' },
                  'Kutilmoqda': { label: 'Kutilmoqda', className: 'text-amber-500 bg-amber-50' },
                  'Rad etildi': { label: 'Rad etildi', className: 'text-rose-500 bg-rose-50' },
                };
                const ps = statusMap[item.status] ?? { label: item.status, className: 'text-slate-500 bg-slate-50' };
                const dateStr = item.date ? new Date(item.date).toLocaleDateString('uz-UZ') : '';
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.amount.toLocaleString()} UZS</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{dateStr} • {item.method}</p>
                      </div>
                    </div>
                    <span className={cn("text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider", ps.className)}>
                      {ps.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'Uyga vazifa':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Uyga vazifalar</h3>
            <div className="text-center py-12 text-slate-400">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm font-bold">Uyga vazifalar topilmadi</p>
              <p className="text-xs mt-1">Bu o'quvchiga hali uyga vazifa berilmagan</p>
            </div>
          </div>
        );
      case 'Izohlar':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">O'qituvchilar izohlari</h3>
            <div className="text-center py-12 text-slate-400">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm font-bold">Izohlar topilmadi</p>
              <p className="text-xs mt-1">Bu o'quvchiga hali izoh yozilmagan</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {/* Active Groups */}
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-4">A'zo bo'lgan guruhlari</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.length === 0 ? (
                  <p className="text-sm text-slate-500">Guruhga a'zo emas</p>
                ) : groups.map((g) => (
                  <div key={g.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-[#ec5b13]/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-white rounded-xl flex items-center justify-center text-[#ec5b13] shadow-sm">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{g.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">O'qituvchi: {g.teacher_name || "Noma'lum"}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{g.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Payments — admin-only */}
            {isAdmin && payments.length > 0 && (
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Oxirgi to'lovlar</h3>
                <div className="space-y-4">
                  {payments.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex gap-4">
                      <div className="size-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-500">
                        <CreditCard size={20} />
                      </div>
                      <div className="flex-1 border-b border-slate-50 pb-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-900">{p.amount.toLocaleString()} UZS</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{p.date ? new Date(p.date).toLocaleDateString('uz-UZ') : ''}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{p.method} orqali to'langan</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="text-slate-500 font-bold">Yuklanmoqda...</div>
        </main>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="text-rose-500 font-bold">{error || "O'quvchi topilmadi"}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#ec5b13] font-bold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Orqaga qaytish</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-orange-400 to-[#ec5b13]"></div>
              <div className="px-6 pb-6 -mt-12">
                <div className="relative inline-block">
                  <div className="size-24 rounded-3xl bg-white p-1 shadow-xl">
                    {student.avatar ? (
                      <img src={student.avatar} alt={student.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl border border-slate-100">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "absolute bottom-1 right-1 size-5 border-4 border-white rounded-full",
                    student.status === 'Faol' ? "bg-emerald-500" :
                    student.status === 'Muzlatilgan' ? "bg-amber-500" : "bg-slate-400"
                  )}></div>
                </div>
                
                <div className="mt-4">
                  <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
                  <p className="text-sm font-bold text-slate-400">ID: #{student.id.substring(0, 8).toUpperCase()}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Phone size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <MapPin size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{student.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Calendar size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{student.birthDate}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => setIsFreezeOpen(true)}
                      className={cn(
                        "py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                        student.status === 'Muzlatilgan'
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                    >
                      {student.status === 'Muzlatilgan' ? <Sun size={14} /> : <Snowflake size={14} />}
                      {student.status === 'Muzlatilgan' ? 'Faollashtirish' : 'Muzlatish'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Info */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Ota-onasi haqida</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Ismi sharifi</p>
                  <p className="text-sm font-bold text-slate-900">{student.parentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Telefon raqami</p>
                  <p className="text-sm font-bold text-slate-900">{student.parentPhone}</p>
                </div>
              </div>
            </div>

            {/* Login Credentials — admin-only */}
            {isAdmin && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Mobil ilova hisobi</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Login</p>
                    <p className="text-sm font-bold text-slate-900">{student.login || 'Kiritilmagan'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Parol</p>
                    <p className="text-sm font-bold text-slate-900">{student.password ? '••••••••' : 'Kiritilmagan'}</p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Right Column: Stats and Tabs */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Qarzdorlik</span>
                </div>
                <h4 className={cn("text-2xl font-black", student.debt > 0 ? "text-red-500" : "text-slate-900")}>
                  {student.debt.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
                </h4>
                <div className="mt-2">
                  {(() => {
                    const ps = getPaymentStatus(student.debt, student.paid);
                    const meta = PAYMENT_STATUS_META[ps];
                    return (
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider", meta.className)}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">To'langan</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{student.paid.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></h4>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Davomat</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">
                  {attendances.length > 0
                    ? Math.round((attendances.filter(a => a.status === 'present').length / attendances.length) * 100)
                    : 0}
                  {' '}<span className="text-xs font-normal text-slate-400">%</span>
                </h4>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
                {tabs.map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-3 text-sm font-bold rounded-2xl transition-all",
                      activeTab === tab ? "bg-white text-[#ec5b13] shadow-sm" : "text-slate-500 hover:bg-white/50"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-8">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </main>

      <StudentFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editingStudent={student}
        groupOptions={groupOptions}
        onSuccess={() => fetchStudent()}
      />

      <Modal
        isOpen={isFreezeOpen}
        onClose={() => !isFreezeSubmitting && setIsFreezeOpen(false)}
        title={student.status === 'Muzlatilgan' ? "O'quvchini faollashtirish" : "O'quvchini muzlatish"}
        footer={
          <>
            <button
              onClick={() => setIsFreezeOpen(false)}
              disabled={isFreezeSubmitting}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-70"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleFreezeConfirm}
              disabled={isFreezeSubmitting}
              className={cn(
                "flex-1 py-3 text-white rounded-2xl text-sm font-bold transition-all shadow-lg disabled:opacity-70",
                student.status === 'Muzlatilgan'
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
              )}
            >
              {isFreezeSubmitting ? 'Bajarilmoqda...' : (student.status === 'Muzlatilgan' ? 'Faollashtirish' : 'Muzlatish')}
            </button>
          </>
        }
      >
        <div className="text-center space-y-4">
          <div className={cn(
            "size-16 rounded-full flex items-center justify-center mx-auto",
            student.status === 'Muzlatilgan' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>
            {student.status === 'Muzlatilgan' ? <Sun size={32} /> : <Snowflake size={32} />}
          </div>
          <p className="text-sm text-slate-500">
            {student.status === 'Muzlatilgan' ? (
              <><span className="font-bold text-slate-900">{student.name}</span> qayta faol ro'yxatga qo'shiladi.</>
            ) : (
              <><span className="font-bold text-slate-900">{student.name}</span> muzlatiladi. Muzlatilgan o'quvchilar avtomatik SMS, davomat hisoboti va faol ro'yxatdan chiqariladi.</>
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
};
