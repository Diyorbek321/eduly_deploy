import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/api';

const loginSchema = z.object({
  email: z.string().email("Noto'g'ri email formati").or(z.string().min(1)),
  password: z.string().min(1, "Parol bo'sh bo'lmasligi kerak"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    // Clear any stale session so a previous bad token can't shadow this attempt.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const from = location.state?.from?.pathname || "/";

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email.trim());
      formData.append('password', data.password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token, user: apiUser } = response.data;

      login(access_token, refresh_token, {
        id: String(apiUser.id),
        email: apiUser.email,
        name: apiUser.name,
        role: apiUser.role,
        teacherId: apiUser.teacher_id ?? undefined,
        studentId: apiUser.student_id ?? undefined,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let msg: string;
      if (status === 429) {
        msg = "Juda ko'p urinish. Iltimos, 1 daqiqadan keyin qayta urinib ko'ring.";
      } else if (status === 401 || status === 400) {
        msg = "Email yoki parol noto'g'ri";
      } else if (status === 422) {
        msg = typeof detail === 'string' ? detail : "Email yoki parol formati noto'g'ri";
      } else if (!err.response) {
        msg = "Server bilan bog'lanib bo'lmadi. Backend ishga tushganini tekshiring (localhost:8000).";
      } else {
        msg = typeof detail === 'string' ? detail : `Xatolik yuz berdi (${status ?? 'unknown'})`;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[#ec5b13] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <span className="text-white text-2xl font-black">E</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Tizimga kirish
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Eduly platformasiga xush kelibsiz
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={18} />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'} rounded-xl focus:outline-none focus:ring-2 bg-slate-50 font-medium transition-colors`}
                  placeholder="admin@edusaas.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Parol
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'} rounded-xl focus:outline-none focus:ring-2 bg-slate-50 font-medium transition-colors`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#ec5b13] focus:ring-orange-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 font-medium">
                  Eslab qolish
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#ec5b13] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Kirilmoqda...' : 'Kirish'}
              </button>
            </div>

          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>O'quv markaz hisoblari super-admin tomonidan yaratiladi.</p>
            <p className="mt-1">Hisob ma'lumotlarini o'z markazingiz administratoridan oling.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
