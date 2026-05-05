/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './Layout';
import { useAuth } from './contexts/AuthContext';

import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherChat } from './pages/TeacherChat';
import { TeacherHomework } from './pages/TeacherHomework';
import { TeacherSchedule } from './pages/TeacherSchedule';
import { SupportTeacherDashboard } from './pages/SupportTeacherDashboard';
import { TeacherProfile } from './pages/TeacherProfile';
import { AnalyticsDashboard } from './pages/Analytics';
import { Leaderboard } from './pages/Leaderboard';

// ─── Auth Guard — token yo'q bo'lsa login ga yo'naltiradi ─────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth(); // isAuthenticated emas — token ishlatamiz
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login, token } = useAuth(); // token ni tekshiramiz
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Allaqachon login bo'lsa dashboardga yo'naltir
  React.useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Login (OAuth2 form-urlencoded)
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error?.message || "Email yoki parol noto'g'ri");
      }

      const loginData = payload.data;

      if (loginData.user?.role !== 'TEACHER') {
        throw new Error("Faqat o'qituvchilar uchun kirish");
      }

      // 3. Saqlash
      localStorage.setItem('refresh_token', loginData.refresh_token);
      login(loginData.access_token, loginData.user);

      // 4. Dashboardga o'tish
      navigate('/', { replace: true });

    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="size-16 bg-[#ec5b13] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <span className="text-white text-2xl font-black">E</span>
          </div>
        </div>
        <h2 className="text-2xl font-black text-center text-slate-900 mb-1">Tizimga kirish</h2>
        <p className="text-center text-slate-500 text-sm mb-6">Eduly Teacher Panel</p>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-sm font-bold px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20"
              placeholder="teacher@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
              Parol
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-orange-500/20"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ec5b13] hover:bg-orange-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-orange-200"
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <Routes>
          {/* Login sahifasi */}
          <Route path="/login" element={<LoginPage />} />

          {/* Himoyalangan sahifalar */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="chat" element={<TeacherChat />} />
            <Route path="homework" element={<TeacherHomework />} />
            <Route path="schedule" element={<TeacherSchedule />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="support" element={<SupportTeacherDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}