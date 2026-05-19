import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  MapPin, 
  BookOpen, 
  MoreVertical, 
  Filter,
  X,
  User,
  Calendar,
  Layers,
  UserPlus,
  Edit2,
  Trash2
} from 'lucide-react';

import { cn, getPaymentStatus, PAYMENT_STATUS_META } from '../lib/utils';
import { SkeletonTable } from '../components/SkeletonTable';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { Group, Student } from '../types';

import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Course, Teacher } from '../types';

export const Groups = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const mapGroup = (g: any): Group => ({
    id: String(g.id),
    name: g.name,
    course: g.course_name || '',
    level: g.level || '',
    teacher: g.teacher_name || '',
    room: g.room || '',
    schedule: g.schedule || '',
    time: g.time || '',
    capacity: g.capacity ?? 0,
    studentsCount: g.students_count ?? 0,
    status: g.status ?? 'Faol'
  });

  const [groupList, setGroupList] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Barchasi');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const [isManageStudentsModalOpen, setIsManageStudentsModalOpen] = useState(false);
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Group | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [groupStudentIds, setGroupStudentIds] = useState<Set<string>>(new Set());
  const [searchStudent, setSearchStudent] = useState('');

  interface RosterEntry {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    status: Student['status'];
    debt: number;
    paid: number;
    attendanceRate: number;
    attendanceTotal: number;
  }
  const [rosterById, setRosterById] = useState<Record<string, RosterEntry>>({});

  const [courseOptions, setCourseOptions] = useState<{ id: number; name: string }[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<{ id: number; name: string }[]>([]);
  const [roomOptions, setRoomOptions] = useState<{ id: number; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    courseId: 0,
    level: 'Beginner',
    teacherId: 0,
    room: '302-xona',
    schedule: 'Toq kunlar (Dush-Chor-Jum)',
    time: '',
    capacity: 18,
    studentsCount: 0,
    status: 'Qabul ochiq'
  });

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/groups', { params });
      setGroupList(res.data.map(mapGroup));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Guruhlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [coursesRes, teachersRes, roomsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/teachers'),
        api.get('/rooms')
      ]);
      setCourseOptions(coursesRes.data.map((c: any) => ({ id: c.id, name: c.name })));
      setTeacherOptions(teachersRes.data.items.map((t: any) => ({ id: t.id, name: t.name })));
      setRoomOptions(roomsRes.data.map((r: any) => ({ id: r.id, name: r.name })));
    } catch {
      // silently fail
    }
  };

  const fetchStudentsForGroup = async () => {
    if (!selectedGroupForStudents) return;
    try {
      const [allRes, rosterRes] = await Promise.all([
        api.get('/students', { params: { limit: 500 } }),
        api.get(`/groups/${selectedGroupForStudents.id}/roster`)
      ]);
      const mappedAll: Student[] = allRes.data.items.map((s: Record<string, unknown>) => ({
        id: String(s.id),
        name: s.name as string,
        phone: s.phone as string,
        group: '',
        status: (s.status as Student['status']) ?? 'Faol',
        debt: (s.debt as number) ?? 0,
        paid: (s.paid as number) ?? 0,
        attendance: 0,
        birthDate: (s.birth_date as string) || '',
        gender: (s.gender as Student['gender']) ?? 'Erkak',
        address: (s.address as string) || '',
        parentName: (s.parent_name as string) || '',
        parentPhone: (s.parent_phone as string) || ''
      }));
      const roster = (rosterRes.data as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        name: r.name as string,
        phone: r.phone as string,
        avatar: (r.avatar as string) || undefined,
        status: (r.status as Student['status']) ?? 'Faol',
        debt: Number(r.debt) || 0,
        paid: Number(r.paid) || 0,
        attendanceRate: Number(r.attendance_rate) || 0,
        attendanceTotal: Number(r.attendance_total) || 0,
      } as RosterEntry));
      const idMap: Record<string, RosterEntry> = {};
      const idSet = new Set<string>();
      for (const r of roster) { idMap[r.id] = r; idSet.add(r.id); }
      setAllStudents(mappedAll);
      setRosterById(idMap);
      setGroupStudentIds(idSet);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [searchQuery]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (isManageStudentsModalOpen && selectedGroupForStudents) {
      fetchStudentsForGroup();
    }
  }, [isManageStudentsModalOpen, selectedGroupForStudents]);

  const handleAddClick = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      courseId: courseOptions[0]?.id ?? 0,
      level: 'Beginner',
      teacherId: teacherOptions[0]?.id ?? 0,
      room: '',
      schedule: 'Toq kunlar (Dush-Chor-Jum)',
      time: '',
      capacity: 18,
      studentsCount: 0,
      status: 'Qabul ochiq'
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
    // Find matching course/teacher IDs from names
    const courseMatch = courseOptions.find(c => c.name === group.course);
    const teacherMatch = teacherOptions.find(t => t.name === group.teacher);
    setFormData({
      name: group.name,
      courseId: courseMatch?.id ?? 0,
      level: group.level,
      teacherId: teacherMatch?.id ?? 0,
      room: group.room,
      schedule: group.schedule,
      time: group.time,
      capacity: group.capacity,
      studentsCount: group.studentsCount,
      status: group.status
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (groupToDelete) {
      try {
        await api.delete(`/groups/${groupToDelete.id}`);
        setIsDeleteModalOpen(false);
        setGroupToDelete(null);
        fetchGroups();
      } catch {
        // error handled by interceptor
      }
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        course_id: formData.courseId,
        teacher_id: formData.teacherId || null,
        level: formData.level,
        room: formData.room,
        schedule: formData.schedule,
        time: formData.time,
        capacity: formData.capacity,
        status: formData.status
      };
      if (editingGroup) {
        await api.put(`/groups/${editingGroup.id}`, payload);
      } else {
        await api.post('/groups', payload);
      }
      setIsModalOpen(false);
      fetchGroups();
    } catch {
      // error handled by interceptor
    }
  };

  const handleManageStudentsClick = (group: Group) => {
    setSelectedGroupForStudents(group);
    setIsManageStudentsModalOpen(true);
    setSearchStudent('');
  };

  const handleAddStudentToGroup = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    try {
      await api.post(`/groups/${selectedGroupForStudents.id}/students`, { student_id: Number(studentId) });
      setGroupStudentIds(prev => new Set([...prev, studentId]));
      const src = allStudents.find(s => s.id === studentId);
      if (src) {
        setRosterById(prev => ({
          ...prev,
          [studentId]: {
            id: src.id,
            name: src.name,
            phone: src.phone,
            avatar: src.avatar,
            status: src.status,
            debt: src.debt,
            paid: src.paid,
            attendanceRate: 0,
            attendanceTotal: 0,
          },
        }));
      }
      setGroupList(prev => prev.map(g =>
        g.id === selectedGroupForStudents.id ? { ...g, studentsCount: g.studentsCount + 1 } : g
      ));
      setSelectedGroupForStudents(prev => prev ? { ...prev, studentsCount: prev.studentsCount + 1 } : null);
    } catch {
      // error handled by interceptor
    }
  };

  const handleRemoveStudentFromGroup = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    try {
      await api.delete(`/groups/${selectedGroupForStudents.id}/students/${studentId}`);
      setGroupStudentIds(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      setRosterById(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setGroupList(prev => prev.map(g =>
        g.id === selectedGroupForStudents.id ? { ...g, studentsCount: Math.max(0, g.studentsCount - 1) } : g
      ));
      setSelectedGroupForStudents(prev => prev ? { ...prev, studentsCount: Math.max(0, prev.studentsCount - 1) } : null);
    } catch {
      // error handled by interceptor
    }
  };

  const filteredGroups = groupList.filter(g => {
    if (activeTab === 'Barchasi') return true;
    return g.status === activeTab;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Guruhlar boshqaruvi</h2>
            <p className="text-sm text-slate-500 mt-1">O'quv guruhlarini shakllantirish va nazorat qilish</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <Plus size={20} />
              <span>Guruh yaratish</span>
            </button>
          )}
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center w-full md:w-auto overflow-x-auto">
            {['Barchasi', 'Faol', 'Qabul ochiq', 'Yopilgan'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-orange-50 text-[#ec5b13]" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-64 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={20} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Guruh nomi..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm outline-none transition-all"
              />
            </div>
            <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 h-[300px] animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchGroups} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <div className="size-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#ec5b13] group-hover:scale-110 transition-transform duration-300">
                      <BookOpen size={28} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        group.status === 'Faol' ? "bg-emerald-100 text-emerald-700" :
                        group.status === 'Qabul ochiq' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {group.status}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleManageStudentsClick(group)}
                            className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                            title="O'quvchilarni boshqarish"
                          >
                            <Users size={18} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(group)}
                            className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(group)}
                            className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1">{group.name}</h3>
                  <p className="text-sm text-slate-500 font-bold mb-6">{group.course}</p>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                        <User size={16} />
                      </div>
                      <span className="text-slate-600 font-medium">
                        <strong className="text-slate-900">O'qituvchi:</strong> {group.teacher}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                        <Calendar size={16} />
                      </div>
                      <span className="text-slate-600 font-medium">
                        <strong className="text-slate-900">Jadval:</strong> {group.schedule}, {group.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                        <MapPin size={16} />
                      </div>
                      <span className="text-slate-600 font-medium">
                        <strong className="text-slate-900">Xona:</strong> {group.room}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">To'lganlik</span>
                      </div>
                      <span className="text-sm font-black text-[#ec5b13]">{group.studentsCount} / {group.capacity}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          group.status === 'Faol' ? "bg-emerald-500" :
                          group.status === 'Qabul ochiq' ? "bg-blue-500" : "bg-orange-500"
                        )} 
                        style={{ width: `${(group.studentsCount / group.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Group Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? "Guruhni tahrirlash" : "Yangi guruh yaratish"}
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Guruh nomi</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: Matematika N1" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Kursni tanlang</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select
                value={formData.courseId}
                onChange={(e) => setFormData(prev => ({ ...prev, courseId: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option value={0}>Kursni tanlang</option>
                {courseOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Daraja (Level)</label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select 
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option>Beginner</option>
                <option>Elementary</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>IELTS</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">O'qituvchini tanlang</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData(prev => ({ ...prev, teacherId: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option value={0}>O'qituvchini tanlang</option>
                {teacherOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Xonani tanlang</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option value="">Xonani tanlang</option>
                {roomOptions.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Kunlar</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select 
                value={formData.schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none"
              >
                <option>Toq kunlar (Dush-Chor-Jum)</option>
                <option>Juft kunlar (Sesh-Pay-Shan)</option>
                <option>Har kuni</option>
                <option>Dam olish kunlari</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Vaqti</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: 14:00 - 15:30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Sig'imi (Capacity)</label>
            <input 
              type="number" 
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              placeholder="Masalan: 18" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">O'quvchilar soni</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="number" 
                value={formData.studentsCount}
                onChange={(e) => setFormData(prev => ({ ...prev, studentsCount: Number(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: 0" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
            >
              <option>Qabul ochiq</option>
              <option>Faol</option>
              <option>Yopilgan</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Manage Students Modal */}
      <Modal
        isOpen={isManageStudentsModalOpen}
        onClose={() => setIsManageStudentsModalOpen(false)}
        title={`${selectedGroupForStudents?.name} - O'quvchilarni boshqarish`}
        footer={
          <button onClick={() => setIsManageStudentsModalOpen(false)} className="w-full py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">
            Yopish
          </button>
        }
      >
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="O'quvchini qidirish..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Students in Group */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-900">Guruhdagi o'quvchilar</h4>
                <span className="text-xs font-bold text-[#ec5b13] bg-orange-50 px-2 py-1 rounded-lg">
                  {Object.keys(rosterById).length} ta
                </span>
              </div>
              <div className="h-[300px] overflow-y-auto space-y-2 pr-2">
                {Object.values(rosterById)
                  .filter(r => r.name.toLowerCase().includes(searchStudent.toLowerCase()))
                  .map(r => {
                    const ps = getPaymentStatus(r.debt, r.paid);
                    const psMeta = PAYMENT_STATUS_META[ps];
                    const isFrozen = r.status === 'Muzlatilgan';
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border",
                          isFrozen ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-100"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                              r.status === 'Faol' ? "bg-emerald-100 text-emerald-700"
                                : r.status === 'Muzlatilgan' ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-600"
                            )}>
                              {r.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-medium">{r.phone}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                              psMeta.className
                            )}>
                              {psMeta.label}
                            </span>
                            {r.debt > 0 && (
                              <span className="text-[10px] font-bold text-rose-600">
                                {r.debt.toLocaleString()} UZS
                              </span>
                            )}
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                              r.attendanceTotal === 0 ? "bg-slate-200 text-slate-500"
                                : r.attendanceRate >= 80 ? "bg-emerald-100 text-emerald-700"
                                : r.attendanceRate >= 50 ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            )}>
                              {r.attendanceTotal === 0 ? 'Davomat: —' : `Davomat: ${r.attendanceRate}%`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveStudentFromGroup(r.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                          title="Guruhdan o'chirish"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                {Object.keys(rosterById).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">
                    Guruhda o'quvchilar yo'q
                  </div>
                )}
              </div>
            </div>

            {/* Available Students */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-900">Boshqa o'quvchilar</h4>
              </div>
              <div className="h-[300px] overflow-y-auto space-y-2 pr-2">
                {allStudents
                  .filter(s => !groupStudentIds.has(s.id))
                  .filter(s => s.name.toLowerCase().includes(searchStudent.toLowerCase()))
                  .map(student => {
                    const isFrozen = student.status === 'Muzlatilgan';
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                            {isFrozen && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">
                                Muzlatilgan
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">{student.phone}</p>
                        </div>
                        <button
                          onClick={() => handleAddStudentToGroup(student.id)}
                          disabled={selectedGroupForStudents ? selectedGroupForStudents.studentsCount >= selectedGroupForStudents.capacity : true}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Guruhga qo'shish"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Guruhni o'chirish"
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
              Siz <span className="font-bold text-slate-900">{groupToDelete?.name}</span> guruhini tizimdan o'chirmoqchisiz. Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
