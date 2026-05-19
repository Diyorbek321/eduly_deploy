import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

export interface MpUser {
  id: string;
  email: string;
  name: string | null;
  center_id: number | null;
}

interface AuthCtx {
  user: MpUser | null;
  token: string | null;
  login: (token: string, user: MpUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MpUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = sessionStorage.getItem('mp_token');
    const u = sessionStorage.getItem('mp_user');
    if (t && u) {
      try {
        const parsed = JSON.parse(u) as MpUser;
        setToken(t);
        setUser(parsed);
        api.get('/auth/me')
          .then(res => {
            const d = res.data;
            setUser({ id: String(d.id), email: d.email, name: d.name ?? null, center_id: d.center_id ?? null });
          })
          .catch(() => {
            sessionStorage.removeItem('mp_token');
            sessionStorage.removeItem('mp_user');
            setToken(null); setUser(null);
          })
          .finally(() => setLoading(false));
        return;
      } catch {
        sessionStorage.removeItem('mp_token');
        sessionStorage.removeItem('mp_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: MpUser) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('mp_token', newToken);
    sessionStorage.setItem('mp_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null); setUser(null);
    sessionStorage.removeItem('mp_token');
    sessionStorage.removeItem('mp_user');
    window.location.href = '/manager/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
