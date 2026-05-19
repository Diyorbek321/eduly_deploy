import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email va parol kiriting"); return; }
    setLoading(true); setError('');
    try {
      // OAuth2 form-data login
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const data = res.data?.data ?? res.data;
      const accessToken: string = data.access_token;
      const userBrief = data.user ?? data;

      if (userBrief.role !== 'ADMIN') {
        setError("Bu panel faqat filial menejerlar uchun. Administrator panelidan foydalaning.");
        return;
      }

      login(accessToken, {
        id: String(userBrief.id),
        email: userBrief.email,
        name: userBrief.name ?? null,
        center_id: userBrief.center_id ?? null,
      });
      navigate('/', { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? e?.response?.data?.detail ?? 'Email yoki parol noto\'g\'ri';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#ec5b13] shadow-lg shadow-orange-500/30 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Eduly Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Filial menejeri paneli</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-black text-white mb-6">Kirish</h2>

          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@filial.uz"
                className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Parol</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#ec5b13] hover:bg-orange-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Kirish
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Kirish ma'lumotlarini administrator beradi
        </p>
      </div>
    </div>
  );
};
