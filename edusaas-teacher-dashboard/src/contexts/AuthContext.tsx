// ============================================================
// FAYL 1: src/contexts/AuthContext.tsx
// ============================================================
// Eski faylni shu bilan almashtiring

import React, { createContext, useContext, useState } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  name?: string;
  role: 'TEACHER' | 'SUPPORT_TEACHER' | 'ADMIN' | 'STUDENT';
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Mock data O'CHIRILDI — real localStorage dan o'qiydi
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null; // null — login kerak
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || null; // null — mock token o'chirildi
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    // axios default header
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  // Sahifa yangilanganda token ni axios ga qo'shish
  React.useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}