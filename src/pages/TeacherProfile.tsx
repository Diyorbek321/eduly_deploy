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
  room?: string;
}

const DAY_NAMES_FULL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function parseScheduleDays(schedule: string): number[] {
  const s = (schedule || '').toLowerCase();
  if (s.includes('har kuni')) return [0, 1, 2, 3, 4, 5];
  if (s.includes('toq') || (s.includes('dush') && s.includes('chor') && s.includes('jum'))) return [0, 2, 4];
  if (s.includes('juft') || (s.includes('sesh') && s.includes('pay') && s.includes('shan'))) return [1, 3, 5];
  const dayMap: Record<string, number> = { dush: 0, sesh: 1, chor: 2, pay: 3, jum: 4, shan: 5 };
  const days: number[] = [];
  for (const [key, val] of Object.entries(dayMap)) {
    if (s.includes(key)) days.push(val);
  }
  return days.sort((a, b) => a - b);
}

function parseStartTime(time: string): string {
  const match = (time || '').match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

interface SalaryInfo {
  id: number;
  month: string;
  base_amount: number;
  bonus: number;
  total_amount: number;
  percent_used: number | null;
  payments_total: number | null;
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
  const [kpiHistory, setKpiHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [teacherRes, groupsRes, salariesRes, kpiRes, badgesRes] = await Promise.all([
          api.get(`/teachers/${id}`),
          api.get(`/teachers/${id}/groups`),
          api.get(`/teachers/${id}/salaries`),
          api.get(`/kpi/${id}/history`).catch(() => ({ data: [] })),
          api.get(`/kpi/${id}/badges`).catch(() => ({ data: [] })),
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
          salaryPercent: t.salary_percent ?? 40,
          basePerStudent: t.base_per_student ?? 120000,
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
        setKpiHistory(kpiRes.data || []);
        setBadges(badgesRes.data || []);
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
      case 'Dars jadvali': {
        const slots = teacherGroups.flatMap((g) => {
          const days = parseScheduleDays(g.schedule);
          const startTime = parseStartTime(g.time);
          return days.map((d) => ({
            day: d,
            time: startTime,
            rawTime: g.time,
            group: g.name,
            room: g.room || '',
          }));
        }).sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time));

        return (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900">Haftalik dars jadvali</h3>
            {slots.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold">Bu o'qituvchi uchun jadval topilmadi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white flex items-center justify-center text-[#ec5b13] shadow-sm">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{DAY_NAMES_FULL[item.day]}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {item.rawTime || item.time}{item.room ? ` • ${item.room}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100">
                      {item.group}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Maosh</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {((teacher as any).basePerStudent ?? 120000).toLocaleString()} UZS/o'quvchi
                  </span>
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <DollarSign size={18} />
                  </div>
                </div>
              </div>

              {/* Current month — live */}
              {(() => {
                const currentMonth = new Date().toISOString().substring(0, 7);
                const current = salaries.find(s => s.month === currentMonth);
                return (
                  <div className={cn(
                    "p-4 rounded-2xl border",
                    current?.is_paid
                      ? "bg-slate-50 border-slate-200"
                      : "bg-emerald-50 border-emerald-200"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Bu oy ({currentMonth})
                      </p>
                      {current?.is_paid ? (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">To'landi ✓</span>
                      ) : (
                        <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Kutilmoqda</span>
                      )}
                    </div>
                    {current ? (
                      <>
                        <p className="text-2xl font-black text-slate-900">
                          {current.total_amount.toLocaleString()}
                          <span className="text-sm font-normal text-slate-400 ml-1">UZS</span>
                        </p>
                        {current.payments_total != null && (
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            {current.payments_total.toLocaleString()} UZS × {current.percent_used ?? 40}% = {current.base_amount.toLocaleString()} UZS
                            {current.bonus > 0 && ` + ${current.bonus.toLocaleString()} UZS bonus`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 font-medium">Bu oy hali to'lov qilinmagan</p>
                    )}
                  </div>
                );
              })()}

              {/* Last 6 months history */}
              {salaries.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Oxirgi oylar</p>
                  <div className="space-y-2">
                    {salaries.slice(0, 6).map(s => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-xs font-black text-slate-700">{s.month}</p>
                          {s.payments_total != null && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              {s.payments_total.toLocaleString()} × {s.percent_used ?? 40}%
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{s.total_amount.toLocaleString()} UZS</p>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full",
                            s.is_paid ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                          )}>
                            {s.is_paid ? "To'landi" : "Kutilmoqda"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* KPI Score Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">KPI Ball</h3>
                {kpiHistory.length > 0 && (() => {
                  const latest = kpiHistory[0];
                  const tierColors: Record<string, string> = {
                    platinum: 'bg-purple-100 text-purple-700',
                    gold:     'bg-yellow-100 text-yellow-700',
                    silver:   'bg-slate-100 text-slate-600',
                    none:     'bg-slate-50 text-slate-400',
                  };
                  const tierLabels: Record<string, string> = {
                    platinum: '🏆 Platinum',
                    gold:     '🥇 Gold',
                    silver:   '🥈 Silver',
                    none:     '—',
                  };
                  return (
                    <span className={cn("text-[10px] font-black px-2 py-1 rounded-full", tierColors[latest.bonus_tier] ?? 'bg-slate-50 text-slate-400')}>
                      {tierLabels[latest.bonus_tier] ?? '—'}
                    </span>
                  );
                })()}
              </div>

              {kpiHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">KPI hali hisoblanmagan. "Hisoblash" tugmasini bosing.</p>
              ) : (() => {
                const latest = kpiHistory[0];
                const score = latest.total_score ?? 0;
                const scoreColor = score >= 90 ? '#8b5cf6' : score >= 75 ? '#f59e0b' : score >= 60 ? '#64748b' : '#ef4444';
                return (
                  <div className="space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black" style={{ color: scoreColor }}>{score.toFixed(1)}</span>
                      <span className="text-slate-400 text-sm font-bold mb-1">/ 100 bal · {latest.month}</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: "O'quvchi saqlanishi", score: latest.retention_score, max: 30 },
                        { label: 'Uy vazifasi', score: latest.homework_score, max: 25 },
                        { label: 'Davomat', score: latest.attendance_score, max: 25 },
                        { label: "To'lov o'z vaqtida", score: latest.payment_score, max: 20 },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold w-36 shrink-0">{item.label}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.round((item.score / item.max) * 100)}%`, background: scoreColor }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-700 w-10 text-right">{item.score}/{item.max}</span>
                        </div>
                      ))}
                    </div>
                    {latest.bonus_percent > 0 && (
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        +{latest.bonus_percent}% bonus maoshga qo'shiladi
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Badges */}
              {badges.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Yutuqlar</p>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b: any) => {
                      const icons: Record<string, string> = {
                        homework_champion: '📚', perfect_attendance: '✅',
                        zero_dropout: '🛡️', rising_star: '⭐', full_house: '🏠',
                      };
                      return (
                        <span key={b.id} title={b.description} className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold text-slate-600">
                          <span>{icons[b.badge_type] ?? '🏅'}</span>
                          {b.description?.split('—')[0]?.trim() || b.badge_type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
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
            <label className="text-xs font-black text-slate-400 uppercase">O'quvchi boshiga asosiy maosh (UZS)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={1000}
                defaultValue={(teacher as any).basePerStudent ?? 120000}
                name="base_per_student"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">UZS</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Har bir to'lagan o'quvchi uchun kafolatlangan miqdor + ortiqcha to'lovning 1/3 qismi qo'shiladi</p>
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
