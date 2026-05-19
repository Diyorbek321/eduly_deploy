import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import api from '../lib/api';

interface SupportTeacher {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  avatar?: string;
  availableDays: string[];
  timeRange: string;
}

interface Booking {
  id: string;
  studentName: string;
  teacherId: string;
  teacherName?: string;
  date: string;
  time: string;
  status: 'Kutilmoqda' | 'Tasdiqlangan' | 'Bekor qilingan' | 'Yakunlangan';
  topic: string;
}

const mapBooking = (b: any): Booking => ({
  id: String(b.id),
  studentName: b.student_name,
  teacherId: String(b.teacher_id),
  teacherName: b.teacher_name ?? undefined,
  date: b.date,
  time: b.time,
  topic: b.topic ?? '',
  status: b.status,
});

export const SupportTeachers = () => {
  const [activeTab, setActiveTab] = useState('O\'qituvchilar');
  const [teachers, setTeachers] = useState<SupportTeacher[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<SupportTeacher | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [tRes, bRes] = await Promise.all([
          api.get('/teachers'),
          api.get('/support-bookings').catch(() => ({ data: [] })),
        ]);
        const raw = Array.isArray(tRes.data) ? tRes.data : tRes.data.items ?? [];
        setTeachers(
          raw.map((t: any) => ({
            id: String(t.id),
            name: t.name,
            specialty: t.specialty || '',
            phone: t.phone,
            avatar: t.avatar || undefined,
            availableDays: [],
            timeRange: '',
          }))
        );
        setBookings((bRes.data || []).map(mapBooking));
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const [teacherForm, setTeacherForm] = useState({
    name: '',
    specialty: '',
    phone: '',
    availableDays: [] as string[],
    timeRange: ''
  });

  const [bookingForm, setBookingForm] = useState({
    studentName: '',
    teacherId: '',
    date: '',
    time: '',
    topic: ''
  });

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({ name: '', specialty: '', phone: '', availableDays: [], timeRange: '' });
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: SupportTeacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      specialty: teacher.specialty,
      phone: teacher.phone,
      availableDays: [...teacher.availableDays],
      timeRange: teacher.timeRange
    });
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = async () => {
    try {
      const payload = {
        name: teacherForm.name,
        phone: teacherForm.phone,
        specialty: teacherForm.specialty,
      };
      if (editingTeacher) {
        const res = await api.put(`/teachers/${editingTeacher.id}`, payload);
        const t = res.data;
        setTeachers(prev => prev.map(teacher =>
          teacher.id === editingTeacher.id
            ? { ...teacher, name: t.name, phone: t.phone, specialty: t.specialty || '' }
            : teacher
        ));
      } else {
        const res = await api.post('/teachers', payload);
        const t = res.data;
        setTeachers(prev => [...prev, {
          id: String(t.id),
          name: t.name,
          specialty: t.specialty || '',
          phone: t.phone,
          avatar: t.avatar || undefined,
          availableDays: teacherForm.availableDays,
          timeRange: teacherForm.timeRange,
        }]);
      }
    } catch {
      // silently fail
    }
    setIsTeacherModalOpen(false);
  };

  const handleSaveBooking = async () => {
    if (!bookingForm.teacherId || !bookingForm.date || !bookingForm.time) {
      setIsBookingModalOpen(false);
      return;
    }
    try {
      const res = await api.post('/support-bookings', {
        student_name: bookingForm.studentName,
        teacher_id: Number(bookingForm.teacherId),
        date: bookingForm.date,
        time: bookingForm.time,
        topic: bookingForm.topic,
      });
      setBookings(prev => [mapBooking(res.data), ...prev]);
    } catch {
      // silently fail
    }
    setIsBookingModalOpen(false);
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    try {
      const res = await api.put(`/support-bookings/${id}`, { status });
      setBookings(prev => prev.map(b => b.id === id ? mapBooking(res.data) : b));
    } catch {
      // silently fail
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Tasdiqlangan': return 'bg-emerald-100 text-emerald-700';
      case 'Kutilmoqda': return 'bg-amber-100 text-amber-700';
      case 'Bekor qilingan': return 'bg-rose-100 text-rose-700';
      case 'Yakunlangan': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Support O'qituvchilar</h2>
            <p className="text-sm text-slate-500 mt-1">Qo'shimcha yordam darslari va bandlovlarni boshqarish</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
              <button 
                onClick={() => setActiveTab('O\'qituvchilar')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'O\'qituvchilar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                O'qituvchilar
              </button>
              <button 
                onClick={() => setActiveTab('Bandlovlar')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'Bandlovlar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Bandlovlar
              </button>
            </div>
            {activeTab === 'O\'qituvchilar' ? (
              <button 
                onClick={handleAddTeacher}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
              >
                <Plus size={18} />
                <span>+ O'qituvchi qo'shish</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  setBookingForm({ studentName: '', teacherId: '', date: '', time: '', topic: '' });
                  setIsBookingModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
              >
                <Plus size={18} />
                <span>+ Bandlov yaratish</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'O\'qituvchilar' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl border-2 border-slate-50">
                      {teacher.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{teacher.name}</h3>
                      <p className="text-sm font-bold text-[#ec5b13] bg-orange-50 inline-block px-2 py-0.5 rounded-lg mt-1">{teacher.specialty}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditTeacher(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={async () => {
                      try {
                        await api.delete(`/teachers/${teacher.id}`);
                        setTeachers(prev => prev.filter(t => t.id !== teacher.id));
                      } catch { /* silently fail */ }
                    }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <Phone size={14} />
                    </div>
                    <span className="font-bold text-slate-700">{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <Calendar size={14} />
                    </div>
                    <div className="flex gap-1">
                      {teacher.availableDays.map(day => (
                        <span key={day} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase">{day}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <Clock size={14} />
                    </div>
                    <span className="font-bold text-slate-700">{teacher.timeRange}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Barcha bandlovlar</h3>
                  <p className="text-xs text-slate-500 font-bold">O'quvchilarning 30 daqiqalik qo'shimcha darslari</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">O'quvchi</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">O'qituvchi</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Sana va Vaqt</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Mavzu</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((booking) => {
                    const teacher = teachers.find(t => t.id === booking.teacherId);
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-slate-900">{booking.studentName}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-700">{teacher?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{teacher?.specialty}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Calendar size={14} className="text-slate-400" />
                            {booking.date}
                            <span className="text-slate-300">|</span>
                            <Clock size={14} className="text-slate-400" />
                            {booking.time}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{booking.topic}</td>
                        <td className="px-6 py-4">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", getStatusColor(booking.status))}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {booking.status === 'Kutilmoqda' && (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => updateBookingStatus(booking.id, 'Tasdiqlangan')}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                title="Tasdiqlash"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button 
                                onClick={() => updateBookingStatus(booking.id, 'Bekor qilingan')}
                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                title="Bekor qilish"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                          {booking.status === 'Tasdiqlangan' && (
                            <button 
                              onClick={() => updateBookingStatus(booking.id, 'Yakunlangan')}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                              Yakunlash
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Teacher Modal */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title={editingTeacher ? "Support o'qituvchini tahrirlash" : "Yangi support o'qituvchi"}
        footer={
          <>
            <button onClick={() => setIsTeacherModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSaveTeacher} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ismi sharifi</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={teacherForm.name}
                onChange={e => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: Sardor Qodirov" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Mutaxassisligi</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={teacherForm.specialty}
                  onChange={e => setTeacherForm(prev => ({ ...prev, specialty: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                  placeholder="Matematika" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={teacherForm.phone}
                  onChange={e => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                  placeholder="+998 90..." 
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ish kunlari</label>
            <div className="flex flex-wrap gap-2">
              {['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'].map(day => (
                <button 
                  key={day}
                  onClick={() => {
                    setTeacherForm(prev => ({
                      ...prev,
                      availableDays: prev.availableDays.includes(day) 
                        ? prev.availableDays.filter(d => d !== day)
                        : [...prev.availableDays, day]
                    }))
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-sm font-bold transition-all",
                    teacherForm.availableDays.includes(day)
                      ? "bg-[#ec5b13] border-[#ec5b13] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ish vaqti oralig'i</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={teacherForm.timeRange}
                onChange={e => setTeacherForm(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="14:00 - 18:00" 
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Yangi bandlov yaratish"
        footer={
          <>
            <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSaveBooking} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Band qilish</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">O'quvchi ismi</label>
            <input 
              type="text" 
              value={bookingForm.studentName}
              onChange={e => setBookingForm(prev => ({ ...prev, studentName: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              placeholder="O'quvchi ismini kiriting" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Support O'qituvchi</label>
            <select 
              value={bookingForm.teacherId}
              onChange={e => setBookingForm(prev => ({ ...prev, teacherId: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
            >
              <option value="">O'qituvchini tanlang</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.specialty})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Sana</label>
              <input 
                type="date" 
                value={bookingForm.date}
                onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Vaqt (30 daqiqa)</label>
              <input 
                type="time" 
                value={bookingForm.time}
                onChange={e => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Mavzu / Muammo</label>
            <textarea 
              value={bookingForm.topic}
              onChange={e => setBookingForm(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm resize-none h-24" 
              placeholder="Qaysi mavzuda yordam kerakligini qisqacha yozing..." 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
