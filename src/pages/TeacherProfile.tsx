import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Star,
  BookOpen,
  Award,
  Edit2,
  Trash2,
  CheckCircle2,
  User,
  Lock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { Modal } from '@/src/components/Modal';
import { decodeId } from '@/src/lib/hashId';

import { Teacher } from '@/src/types';
import api from '@/src/lib/api';

interface TeacherGroup {
  id: number;
  name: string;
  students_count: number;
  schedule: string;
  time: string;
}

interface SalaryInfo {
  id: number;
  month: string;
  base_amount: number;
  bonus: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
}

export const TeacherProfile = () => {
  const navigate = useNavigate();
  const { id: hashedId } = useParams<{ id: string }>();
  const id = hashedId ? decodeId(hashedId) : undefined;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Guruhlar');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [salaries, setSalaries] = useState<SalaryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [teacherRes, groupsRes, salariesRes] = await Promise.all([
          api.get(`/teachers/${id}`),
          api.get(`/teachers/${id}/groups`),
          api.get(`/teachers/${id}/salaries`),
        ]);
        const t = teacherRes.data;
        setTeacher({
          id: String(t.id),
          name: t.name,
          phone: t.phone,
          specialty: t.specialty || '',
          salary: 0,
          bonus: 0,
          hourlyRate: t.hourly_rate ?? 0,
          status: t.status ?? 'Faol',
          groupsCount: t.groups_count ?? 0,
          studentsCount: t.students_count ?? 0,
          hours: 0,
          rating: t.rating ?? 0,
          avatar: t.avatar || undefined,
          experience: t.experience || undefined,
          birthDate: t.birth_date || undefined,
          bio: t.bio || undefined,
        });
        setTeacherGroups(groupsRes.data);
        setSalaries(salariesRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "O'qituvchi ma'lumotlarini yuklashda xatolik");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  const tabs = ['Guruhlar', 'Dars jadvali', 'To\'lovlar', 'Yutuqlar'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dars jadvali':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Haftalik dars jadvali</h3>
            <div className="space-y-3">
              {[
                { day: 'Dushanba', time: '14:00 - 15:30', group: 'English IELTS #12', room: '304-Xona' },
                { day: 'Seshanba', time: '10:00 - 11:30', group: 'Foundation #4', room: '201-Xona' },
                { day: 'Chorshanba', time: '14:00 - 15:30', group: 'English IELTS #12', room: '304-Xona' },
                { day: 'Payshanba', time: '10:00 - 11:30', group: 'Foundation #4', room: '201-Xona' },
                { day: 'Juma', time: '14:00 - 15:30', group: 'English IELTS #12', room: '304-Xona' },
                { day: 'Shanba', time: '10:00 - 11:30', group: 'Foundation #4', room: '201-Xona' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-white flex items-center justify-center text-[#ec5b13] shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.day}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.time} • {item.room}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100">
                    {item.group}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'To\'lovlar':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Ish haqi tarixi</h3>
            <div className="space-y-3">
              {salaries.length === 0 ? (
                <p className="text-sm text-slate-500">Maosh ma'lumotlari topilmadi</p>
              ) : salaries.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.total_amount.toLocaleString()} UZS</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.month} • Bonus: {item.bonus.toLocaleString()} UZS</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider",
                    item.is_paid ? "text-emerald-500 bg-emerald-50" : "text-amber-500 bg-amber-50"
                  )}>
                    {item.is_paid ? "To'langan" : "Kutilmoqda"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Yutuqlar':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Yutuqlar va Sertifikatlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Yil o\'qituvchisi 2023', date: 'Dekabr, 2023', icon: Award, color: 'text-amber-500' },
                { title: 'IELTS 8.5 Sertifikati', date: 'Avgust, 2022', icon: CheckCircle2, color: 'text-blue-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100">
                  <div className={cn("size-10 rounded-xl flex items-center justify-center bg-slate-50", item.color)}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {/* Active Groups */}
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-4">Biriktirilgan guruhlar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacherGroups.length === 0 ? (
                  <p className="text-sm text-slate-500">Guruhlar topilmadi</p>
                ) : teacherGroups.map((group) => (
                  <div key={group.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-[#ec5b13]/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-white rounded-xl flex items-center justify-center text-[#ec5b13] shadow-sm">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{group.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{group.schedule || ''} • {group.time || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{group.students_count} ta</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">O'quvchi</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="text-slate-500 font-bold">Yuklanmoqda...</div>
        </main>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="text-rose-500 font-bold">{error || "O'qituvchi topilmadi"}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#ec5b13] font-bold transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Orqaga qaytish</span>
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm"
            >
              <Edit2 size={18} />
              <span>Tahrirlash</span>
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-bold text-sm"
            >
              <Trash2 size={18} />
              <span>O'chirish</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
              <div className="px-6 pb-6 -mt-12">
                <div className="relative inline-block">
                  <div className="size-24 rounded-3xl bg-white p-1 shadow-xl">
                    {teacher.avatar ? (
                      <img 
                        src={teacher.avatar} 
                        alt={teacher.name}
                        className="w-full h-full rounded-2xl object-cover border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl border border-slate-100">
                        {teacher.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "absolute bottom-1 right-1 size-5 border-4 border-white rounded-full",
                    teacher.status === 'Faol' ? "bg-emerald-500" : "bg-slate-300"
                  )}></div>
                </div>
                
                <div className="mt-4">
                  <h2 className="text-2xl font-black text-slate-900">{teacher.name}</h2>
                  <p className="text-sm font-bold text-[#ec5b13] bg-orange-50 inline-block px-2 py-0.5 rounded-lg mt-1">{teacher.specialty}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Phone size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Briefcase size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{teacher.experience} tajriba</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Calendar size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{teacher.birthDate}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Biografiya</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {teacher.bio || "Ma'lumot kiritilmagan"}
                  </p>
                </div>
              </div>
            </div>

            {/* Salary Info */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Maosh ma'lumotlari</h3>
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="space-y-4">
                {salaries.length > 0 ? (
                  <>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Asosiy maosh ({salaries[0].month})</p>
                      <p className="text-xl font-black text-slate-900">{salaries[0].base_amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Bonus</p>
                      <p className="text-lg font-black text-emerald-600">+{salaries[0].bonus.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Jami</p>
                      <p className="text-lg font-black text-slate-900">{salaries[0].total_amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Maosh ma'lumotlari kiritilmagan</p>
                )}
              </div>
            </div>

            {/* Login Credentials */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Mobil ilova hisobi</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Login</p>
                    <p className="text-sm font-bold text-slate-900">{teacher.login || 'Kiritilmagan'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Parol</p>
                    <p className="text-sm font-bold text-slate-900">{teacher.password ? '••••••••' : 'Kiritilmagan'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stats and Tabs */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Users size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">O'quvchilar</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{teacher.studentsCount || 0} <span className="text-xs font-normal text-slate-400">ta</span></h4>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Dars soati</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{teacher.hours || 0} <span className="text-xs font-normal text-slate-400">soat</span></h4>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                    <Star size={20} className="fill-amber-600" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Reyting</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{teacher.rating || 0} <span className="text-xs font-normal text-slate-400">/ 5.0</span></h4>
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

      {/* Edit Teacher Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="O'qituvchi ma'lumotlarini tahrirlash"
        footer={
          <>
            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ismi sharifi</label>
            <input type="text" defaultValue={teacher.name} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Telefon raqami</label>
            <input type="text" defaultValue={teacher.phone} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Mutaxassisligi</label>
            <input type="text" defaultValue={teacher.specialty} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Oylik maoshi</label>
            <input type="text" defaultValue={teacher.salary} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Oylik bonus (UZS)</label>
            <input type="number" defaultValue={teacher.bonus} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Tug'ilgan sanasi</label>
            <input type="date" defaultValue={teacher.birthDate} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Status</label>
            <select defaultValue={teacher.status} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer">
              <option>Faol</option>
              <option>Nofaol</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="O'qituvchini o'chirish"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={async () => {
              try {
                await api.delete(`/teachers/${id}`);
                setIsDeleteModalOpen(false);
                navigate('/teachers');
              } catch {
                setIsDeleteModalOpen(false);
              }
            }} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">Ha, o'chirilsin</button>
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
              Siz <span className="font-bold text-slate-900">{teacher.name}</span>ni tizimdan o'chirmoqchisiz. Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
