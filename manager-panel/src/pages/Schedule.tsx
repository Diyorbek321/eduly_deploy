import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Users,
  X,
  Edit2,
  Trash2
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface GroupSchedule {
  id: number;
  name: string;
  teacher_name: string;
  room: string;
  schedule: string;
  time: string;
  course_name: string;
  students_count: number;
  capacity: number;
}

interface RoomData {
  id: number;
  name: string;
  type: string | null;
  capacity: number;
}

interface ScheduleSlot {
  day: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
}

const DAY_NAMES = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
const COLORS = [
  'bg-blue-50 border-blue-500 text-blue-700',
  'bg-emerald-50 border-emerald-500 text-emerald-700',
  'bg-orange-50 border-orange-500 text-orange-700',
  'bg-indigo-50 border-indigo-500 text-indigo-700',
  'bg-rose-50 border-rose-500 text-rose-700',
  'bg-amber-50 border-amber-500 text-amber-700',
  'bg-purple-50 border-purple-500 text-purple-700',
  'bg-teal-50 border-teal-500 text-teal-700',
];

function parseScheduleDays(schedule: string): number[] {
  const s = schedule.toLowerCase();
  if (s.includes('har kuni')) return [0, 1, 2, 3, 4, 5];
  if (s.includes('dam olish')) return [5];
  if (s.includes('toq') || (s.includes('dush') && s.includes('chor') && s.includes('jum'))) return [0, 2, 4];
  if (s.includes('juft') || (s.includes('sesh') && s.includes('pay') && s.includes('shan'))) return [1, 3, 5];
  const dayMap: Record<string, number> = { dush: 0, sesh: 1, chor: 2, pay: 3, jum: 4, shan: 5 };
  const days: number[] = [];
  for (const [key, val] of Object.entries(dayMap)) {
    if (s.includes(key)) days.push(val);
  }
  return days.length > 0 ? days : [0, 2, 4];
}

function parseStartTime(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  const hh = match[1].padStart(2, '0');
  return `${hh}:${match[2]}`;
}

export const Schedule = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dars jadvali');
  const [groups, setGroups] = useState<GroupSchedule[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomData | null>(null);

  const [roomForm, setRoomForm] = useState({ name: '', type: '', capacity: 20 });

  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();
  const weekLabel = `${weekDates[0].getDate()}-${weekDates[5].getDate()} ${weekDates[0].toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}`;

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data.map((g: any) => ({
        id: g.id,
        name: g.name,
        teacher_name: g.teacher_name || '',
        room: g.room || '',
        schedule: g.schedule || '',
        time: g.time || '',
        course_name: g.course_name || '',
        students_count: g.students_count ?? 0,
        capacity: g.capacity ?? 0,
      })));
    } catch {
      // silently fail
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchGroups(), fetchRooms()]);
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  // Build schedule slots from groups
  const scheduleSlots: ScheduleSlot[] = [];
  const timeSet = new Set<string>();
  groups.forEach((g, idx) => {
    const days = parseScheduleDays(g.schedule);
    const startTime = parseStartTime(g.time);
    timeSet.add(startTime);
    const color = COLORS[idx % COLORS.length];
    days.forEach(day => {
      scheduleSlots.push({
        day,
        time: startTime,
        subject: g.name,
        teacher: g.teacher_name,
        room: g.room,
        color,
      });
    });
  });

  const timeSlots = Array.from(timeSet).sort((a, b) => a.localeCompare(b));
  if (timeSlots.length === 0) timeSlots.push('08:00', '10:00', '14:00', '16:00');
  scheduleSlots.sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time) || a.subject.localeCompare(b.subject));

  // Room occupancy: merge room data from API with group usage
  const groupRoomUsage = new Map<string, { current: number }>();
  groups.forEach(g => {
    if (!g.room) return;
    const existing = groupRoomUsage.get(g.room);
    if (existing) {
      existing.current += g.students_count;
    } else {
      groupRoomUsage.set(g.room, { current: g.students_count });
    }
  });

  const roomCards = rooms.map((room, i) => {
    const usage = groupRoomUsage.get(room.name);
    const current = usage?.current ?? 0;
    const percentage = room.capacity > 0 ? Math.round((current / room.capacity) * 100) : 0;
    const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-rose-500', 'bg-blue-500', 'bg-indigo-500'];
    return { ...room, percentage, color: colors[i % colors.length], current };
  });

  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({ name: '', type: '', capacity: 20 });
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: RoomData) => {
    setEditingRoom(room);
    setRoomForm({ name: room.name, type: room.type || '', capacity: room.capacity });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async () => {
    try {
      const payload = {
        name: roomForm.name,
        type: roomForm.type || null,
        capacity: roomForm.capacity,
      };
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      setIsRoomModalOpen(false);
      fetchRooms();
    } catch {
      // error handled by interceptor
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await api.delete(`/rooms/${roomToDelete.id}`);
      setIsDeleteRoomModalOpen(false);
      setRoomToDelete(null);
      fetchRooms();
    } catch {
      // error handled by interceptor
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Dars jadvali va Xonalar</h2>
            <p className="text-sm text-slate-500 mt-1">Markazning dars taqvimi va xonalar bandligini boshqarish</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
              <button
                onClick={() => setActiveTab('Dars jadvali')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'Dars jadvali' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Dars jadvali
              </button>
              <button
                onClick={() => setActiveTab('Xonalar')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'Xonalar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Xonalar
              </button>
            </div>
            {activeTab === 'Xonalar' && isAdmin && (
              <button
                onClick={handleOpenAddRoom}
                className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
              >
                <Plus size={18} />
                <span>Xona qo'shish</span>
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm">
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {activeTab === 'Dars jadvali' ? (
          <>
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 gap-4">
                <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                  <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <span className="text-sm font-bold text-slate-900">{weekLabel}</span>
                <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-3xl border border-slate-200 h-[400px] animate-pulse"></div>
            ) : (
            <div className="flex gap-8">
              {/* Schedule Grid */}
              <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[100px_repeat(6,1fr)] border-b border-slate-100">
                  <div className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider border-r border-slate-100 flex items-center justify-center">
                    Vaqt
                  </div>
                  {weekDates.map((date, i) => (
                    <div key={i} className={cn(
                      "p-4 text-center border-r border-slate-100 last:border-r-0",
                      date.toDateString() === new Date().toDateString() ? "bg-orange-50/30" : ""
                    )}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{DAY_NAMES[i]}</p>
                      <p className={cn(
                        "text-xl font-black mt-1",
                        date.toDateString() === new Date().toDateString() ? "text-[#ec5b13]" : "text-slate-900"
                      )}>{date.getDate()}</p>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-slate-100">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-[100px_repeat(6,1fr)] min-h-[120px]">
                      <div className="p-4 text-xs font-bold text-slate-400 border-r border-slate-100 flex items-start justify-center pt-6">
                        {time}
                      </div>
                      {Array.from({ length: 6 }).map((_, dayIndex) => {
                        const lessons = scheduleSlots.filter(d => d.day === dayIndex && d.time === time);
                        return (
                          <div key={dayIndex} className="p-2 border-r border-slate-100 last:border-r-0 relative group space-y-1">
                            {lessons.map((lesson, li) => (
                              <div key={li} className={cn(
                                "rounded-xl border-l-4 p-3 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer",
                                lesson.color
                              )}>
                                <div>
                                  <p className="text-xs font-black leading-tight">{lesson.subject}</p>
                                  <p className="text-[10px] font-bold opacity-70 mt-1">{lesson.teacher}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-70 mt-1">
                                  <MapPin size={10} />
                                  <span className="text-[10px] font-bold">{lesson.room}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Info */}
              {roomCards.length > 0 && (
                <div className="w-72 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Xonalar bandligi</h3>
                    <div className="space-y-6">
                      {roomCards.map((room) => (
                        <div key={room.id} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-700">{room.name}</span>
                            <span className="text-slate-900">{room.percentage}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", room.color)}
                              style={{ width: `${Math.min(room.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {!isLoading && scheduleSlots.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-bold">Dars jadvali bo'sh</p>
                <p className="text-sm mt-1">Guruhlar yaratilganda jadval avtomatik to'ldiriladi</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rooms.length === 0 && !isLoading ? (
                <div className="col-span-full text-center py-16 text-slate-400">
                  <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-bold">Xonalar topilmadi</p>
                  <p className="text-sm mt-1">Yangi xona qo'shish uchun yuqoridagi tugmani bosing</p>
                </div>
              ) : roomCards.map((room) => (
                <div key={room.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="size-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#ec5b13] group-hover:scale-110 transition-transform duration-300">
                      <MapPin size={28} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        room.percentage >= 90 ? "bg-rose-100 text-rose-700" :
                        room.percentage >= 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {room.percentage >= 90 ? 'Band' : room.percentage >= 60 ? 'Qisman band' : "Bo'sh"}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditRoom(room)}
                            className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => { setRoomToDelete(room); setIsDeleteRoomModalOpen(true); }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-1">{room.name}</h3>
                  {room.type && <p className="text-sm text-slate-500 font-medium mb-4">{room.type}</p>}

                  <div className="space-y-4 mt-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-500">Sig'imi:</span>
                      <span className="text-slate-900">{room.capacity} ta o'rin</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-500">Hozirgi bandlik:</span>
                      <span className="text-slate-900">{room.current} kishi</span>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Bandlik darajasi</span>
                        <span className="text-slate-900">{room.percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", room.color)}
                          style={{ width: `${Math.min(room.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Add/Edit Room Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoom ? "Xonani tahrirlash" : "Yangi xona qo'shish"}
        footer={
          <>
            <button onClick={() => setIsRoomModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSaveRoom} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Xona nomi yoki raqami</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={roomForm.name}
                onChange={e => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: 101-Xona"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Xona turi (Yo'nalish)</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={roomForm.type}
                onChange={e => setRoomForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: IT Laboratoriya"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Sig'imi (O'quvchilar soni)</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="number"
                value={roomForm.capacity}
                onChange={e => setRoomForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: 20"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Room Confirmation */}
      <Modal
        isOpen={isDeleteRoomModalOpen}
        onClose={() => setIsDeleteRoomModalOpen(false)}
        title="Xonani o'chirish"
        footer={
          <>
            <button onClick={() => setIsDeleteRoomModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleDeleteRoom} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">Ha, o'chirilsin</button>
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
              Siz <span className="font-bold text-slate-900">{roomToDelete?.name}</span> xonasini tizimdan o'chirmoqchisiz.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
