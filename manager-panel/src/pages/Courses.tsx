import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Clock, 
  Layers, 
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { Course, Group } from '../types';
import { Users } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export const Courses = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [courseList, setCourseList] = useState<Course[]>([]);
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    price: '',
    maxDurationMonths: '',
    description: ''
  });

  const mapCourse = (c: any): Course => ({
    id: String(c.id),
    name: c.name,
    duration: c.duration || '',
    price: c.price != null ? Number(c.price).toLocaleString() : '0',
    lessonsCount: c.lessons_count ?? 0,
    maxDurationMonths: c.max_duration_months ?? null,
    groupsCount: c.groups_count ?? 0,
    status: c.status ?? 'Faol',
    description: c.description || ''
  });

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

  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/courses', { params });
      setCourseList(res.data.map(mapCourse));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kurslarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroupList(res.data.map(mapGroup));
    } catch {
      // silently fail for groups sidebar
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [searchQuery]);

  useEffect(() => {
    if (isGroupModalOpen) {
      fetchGroups();
    }
  }, [isGroupModalOpen]);

  const handleAddClick = () => {
    setEditingCourse(null);
    setFormData({ name: '', duration: '', price: '', maxDurationMonths: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      duration: course.duration,
      price: course.price,
      maxDurationMonths: course.maxDurationMonths != null ? String(course.maxDurationMonths) : '',
      description: course.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const maxMonths = parseInt(formData.maxDurationMonths, 10);
      const payload = {
        name: formData.name,
        duration: formData.duration,
        price: Number(formData.price.replace(/[^0-9]/g, '')) || 0,
        max_duration_months: isNaN(maxMonths) || maxMonths <= 0 ? null : maxMonths,
        description: formData.description
      };
      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, payload);
      } else {
        await api.post('/courses', payload);
      }
      setIsModalOpen(false);
      fetchCourses();
    } catch {
      // error handled by interceptor
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (courseToDelete) {
      try {
        await api.delete(`/courses/${courseToDelete.id}`);
        setIsDeleteModalOpen(false);
        setCourseToDelete(null);
        fetchCourses();
      } catch {
        // error handled by interceptor
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Kurslar</h2>
            <p className="text-sm text-slate-500 mt-1">Markazda o'tiladigan barcha o'quv yo'nalishlari</p>
          </div>
          {isAdmin && (
            <button 
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <Plus size={20} />
              <span>Kurs qo'shish</span>
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative group max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kurs nomi bo'yicha qidirish" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-400 text-sm outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courseList.map((course) => (
            <div key={course.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="size-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#ec5b13]">
                    <BookOpen size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsGroupModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:bg-orange-50 hover:text-[#ec5b13] rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
                        title="Guruhlarni boshqarish"
                      >
                        <Users size={18} />
                        <span>Guruhlar</span>
                      </button>
                    )}
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                      course.status === 'Faol' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {course.status}
                    </span>
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-[#ec5b13] transition-colors">{course.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-6">{course.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-xs font-bold">{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Layers size={16} className="text-slate-400" />
                    <span className="text-xs font-bold">{course.groupsCount} ta guruh</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Kurs narxi</p>
                    <p className="text-lg font-black text-slate-900">{course.price} <span className="text-xs font-normal text-slate-400">UZS</span></p>
                  </div>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => handleDeleteClick(course)}
                        className="p-3 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleEditClick(course)}
                        className="p-3 bg-slate-50 text-slate-400 hover:bg-[#ec5b13] hover:text-white rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Manage Groups Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={`${selectedCourse?.name} - Guruhlarni biriktirish`}
        footer={
          <button 
            onClick={() => setIsGroupModalOpen(false)} 
            className="w-full py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            Tayyor
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-medium">Ushbu kursga tegishli guruhlarni tanlang:</p>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {groupList.map((group) => (
              <label 
                key={group.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                  group.course === selectedCourse?.name 
                    ? "bg-orange-50 border-orange-200" 
                    : "bg-white border-slate-200 hover:border-orange-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-5 rounded border flex items-center justify-center transition-all",
                    group.course === selectedCourse?.name 
                      ? "bg-[#ec5b13] border-[#ec5b13]" 
                      : "bg-white border-slate-300 group-hover:border-[#ec5b13]"
                  )}>
                    {group.course === selectedCourse?.name && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{group.teacher} • {group.schedule}</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={group.course === selectedCourse?.name}
                  onChange={() => {
                    // In a real app, this would update the backend
                    console.log(`Assigning ${group.name} to ${selectedCourse?.name}`);
                  }}
                />
              </label>
            ))}
          </div>
          <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold hover:border-[#ec5b13] hover:text-[#ec5b13] transition-all flex items-center justify-center gap-2 mt-4">
            <Plus size={18} />
            <span>Yangi guruh yaratish va biriktirish</span>
          </button>
        </div>
      </Modal>

      {/* Add/Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? "Kursni tahrirlash" : "Yangi kurs qo'shish"}
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Kurs nomi</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              placeholder="Masalan: General English" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Davomiyligi</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: 4 oy"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Narxi (oylik)</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
                placeholder="Masalan: 500,000"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Maksimal muddat (oy)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.maxDurationMonths}
              onChange={(e) => setFormData(prev => ({ ...prev, maxDurationMonths: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
              placeholder="Masalan: 6 (ixtiyoriy)"
            />
            <p className="text-[10px] text-slate-400">O'quvchi qo'shilganda maqsad sana avtomatik hisoblanadi</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Tavsif</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm h-24 resize-none" 
              placeholder="Kurs haqida qisqacha ma'lumot..."
            ></textarea>
          </div>
        </div>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Kursni o'chirish"
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
              Siz <span className="font-bold text-slate-900">{courseToDelete?.name}</span> kursini tizimdan o'chirmoqchisiz. Bu amalni ortga qaytarib bo'lmaydi va barcha bog'langan ma'lumotlar o'chib ketishi mumkin.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
