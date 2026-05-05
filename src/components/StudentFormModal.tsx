import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone as PhoneIcon, MapPin, Users, Camera, Lock } from 'lucide-react';
import { Modal } from '@/src/components/Modal';
import { cn } from '@/src/lib/utils';
import api from '@/src/lib/api';
import { Student, Group } from '@/src/types';

const studentSchema = z.object({
  name: z.string().min(3, "Ism kamida 3 ta belgidan iborat bo'lishi kerak"),
  phone: z.string().regex(/^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/, "Format: +998 XX XXX XX XX"),
  birthDate: z.string().min(1, "Tug'ilgan sana kiritilishi shart"),
  gender: z.enum(['Erkak', 'Ayol']),
  groupId: z.string().optional(),
  address: z.string().min(5, "Manzil kamida 5 ta belgidan iborat bo'lishi kerak"),
  parentName: z.string().min(3, "Ism kamida 3 ta belgidan iborat bo'lishi kerak"),
  parentPhone: z.string().regex(/^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/, "Format: +998 XX XXX XX XX"),
  login: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Email formati noto'g'ri (masalan: student@example.com)",
    }),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 6, {
      message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
    }),
  avatar: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  groupOptions: Group[];
  onSuccess: (student: Student) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  editingStudent,
  groupOptions,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: { gender: 'Erkak', groupId: '' },
  });

  const avatarPreview = watch('avatar');

  React.useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);
    if (editingStudent) {
      reset({
        name: editingStudent.name,
        phone: editingStudent.phone,
        birthDate: editingStudent.birthDate,
        gender: editingStudent.gender as 'Erkak' | 'Ayol',
        groupId: '',
        address: editingStudent.address,
        parentName: editingStudent.parentName,
        parentPhone: editingStudent.parentPhone,
        login: editingStudent.login || '',
        // Never pre-fill password — leaving blank means "don't change".
        password: '',
        avatar: editingStudent.avatar || '',
      });
    } else {
      reset({
        name: '', phone: '', birthDate: '', gender: 'Erkak', groupId: '',
        address: '', parentName: '', parentPhone: '', login: '', password: '', avatar: '',
      });
    }
  }, [isOpen, editingStudent, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setValue('avatar', reader.result as string);
    reader.readAsDataURL(file);
  };

  const mapStudent = (s: Record<string, unknown>): Student => ({
    id: String(s.id),
    name: s.name as string,
    phone: s.phone as string,
    group: ((s.group_names as string[]) || []).join(', '),
    status: (s.status as Student['status']) ?? 'Faol',
    debt: (s.debt as number) ?? 0,
    paid: (s.paid as number) ?? 0,
    attendance: 0,
    birthDate: (s.birth_date as string) || '',
    gender: (s.gender as Student['gender']) ?? 'Erkak',
    address: (s.address as string) || '',
    parentName: (s.parent_name as string) || '',
    parentPhone: (s.parent_phone as string) || '',
    avatar: (s.avatar as string) || undefined,
    login: (s.login_email as string) || undefined,
    hasLogin: Boolean(s.has_login),
  });

  const onSubmit = async (data: StudentFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        birth_date: data.birthDate || null,
        address: data.address,
        parent_name: data.parentName,
        parent_phone: data.parentPhone,
        avatar: data.avatar || null,
      };
      // Credentials handling:
      // - Create: both required to enable mobile login (optional).
      // - Edit, no existing login: both required to attach a new account.
      // - Edit, existing login: send only fields that changed (email update or
      //   password reset). Password is intentionally never sent unless the
      //   admin types a new one.
      const trimmedLogin = data.login?.trim().toLowerCase() || '';
      const newPassword = data.password?.trim() || '';
      if (!editingStudent) {
        if (trimmedLogin && newPassword) {
          payload.email = trimmedLogin;
          payload.password = newPassword;
        }
      } else if (editingStudent.hasLogin) {
        if (trimmedLogin && trimmedLogin !== (editingStudent.login || '').toLowerCase()) {
          payload.email = trimmedLogin;
        }
        if (newPassword) {
          payload.password = newPassword;
        }
      } else if (trimmedLogin && newPassword) {
        // No existing login → both fields required to create one.
        payload.email = trimmedLogin;
        payload.password = newPassword;
      }
      let saved: Student;
      if (editingStudent) {
        const res = await api.put(`/students/${editingStudent.id}`, payload);
        saved = mapStudent(res.data);
        if (data.groupId) {
          await api
            .post(`/groups/${data.groupId}/students`, { student_id: Number(editingStudent.id) })
            .catch(() => undefined); // ignore 409 (already enrolled)
        }
      } else {
        const res = await api.post('/students', payload);
        saved = mapStudent(res.data);
        if (data.groupId) {
          await api.post(`/groups/${data.groupId}/students`, { student_id: Number(saved.id) });
        }
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm";
  const inputWithIcon = "w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingStudent ? "O'quvchi ma'lumotlarini tahrirlash" : "Yangi o'quvchi qo'shish"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-70"
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {submitError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700">
            {submitError}
          </div>
        )}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer">
            <div className="size-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-slate-300" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
              <Camera size={24} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-2">Rasm yuklash</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ismi sharifi</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input {...register('name')} type="text" className={cn(inputWithIcon, errors.name ? "border-red-300" : "border-transparent")} placeholder="Masalan: Alisher Sadullayev" />
            </div>
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Telefon raqami</label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input {...register('phone')} type="text" className={cn(inputWithIcon, errors.phone ? "border-red-300" : "border-transparent")} placeholder="+998 90 123 45 67" />
            </div>
            {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Tug'ilgan sanasi</label>
            <input {...register('birthDate')} type="date" className={cn(inputBase, errors.birthDate ? "border-red-300" : "border-transparent")} />
            {errors.birthDate && <p className="text-xs text-red-500 font-medium">{errors.birthDate.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Jinsi</label>
            <select {...register('gender')} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer">
              <option value="Erkak">Erkak</option>
              <option value="Ayol">Ayol</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">Guruhga biriktirish</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select {...register('groupId')} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer appearance-none">
                <option value="">Guruhni tanlang (ixtiyoriy)</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.studentsCount}/{g.capacity})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">Yashash manzili</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input {...register('address')} type="text" className={cn(inputWithIcon, errors.address ? "border-red-300" : "border-transparent")} placeholder="Toshkent sh., Yunusobod t." />
            </div>
            {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-slate-900">Mobil ilova uchun hisob</h4>
            {editingStudent?.hasLogin && (
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                Faol
              </span>
            )}
          </div>
          {editingStudent?.hasLogin && (
            <p className="text-xs text-slate-500 mb-3">
              Mavjud hisob. Parolni faqat o'zgartirmoqchi bo'lsangiz kiriting (bo'sh qoldirish — eski parol saqlanadi).
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Login (email)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input {...register('login')} type="email" autoComplete="off" className={cn(inputWithIcon, errors.login ? "border-red-300" : "border-transparent")} placeholder="student@example.com" />
              </div>
              {errors.login && <p className="text-xs text-red-500 font-medium">{errors.login.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  {...register('password')}
                  type="text"
                  autoComplete="new-password"
                  className={cn(inputWithIcon, errors.password ? "border-red-300" : "border-transparent")}
                  placeholder={editingStudent?.hasLogin ? "Yangi parol (ixtiyoriy)" : "Parolni kiriting"}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-6">
          <h4 className="text-sm font-black text-slate-900 mb-4">Ota-onasi haqida ma'lumot</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Ota-onasi ismi</label>
              <input {...register('parentName')} type="text" className={cn(inputBase, errors.parentName ? "border-red-300" : "border-transparent")} placeholder="Masalan: Jasur Sadullayev" />
              {errors.parentName && <p className="text-xs text-red-500 font-medium">{errors.parentName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Bog'lanish uchun telefon</label>
              <input {...register('parentPhone')} type="text" className={cn(inputBase, errors.parentPhone ? "border-red-300" : "border-transparent")} placeholder="+998 90 987 65 43" />
              {errors.parentPhone && <p className="text-xs text-red-500 font-medium">{errors.parentPhone.message}</p>}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
