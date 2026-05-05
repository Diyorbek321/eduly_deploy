import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { isDemoMode, getDemoRole, buildDemoUser, exitDemo } from '../lib/demoData';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name?: string;
  teacherId?: number;
  studentId?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const mapUser = (data: any): User => ({
  id: String(data.id),
  email: data.email,
  role: data.role,
  name: data.name ?? undefined,
  teacherId: data.teacher_id ?? data.teacherId ?? undefined,
  studentId: data.student_id ?? data.studentId ?? undefined,
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (isDemoMode()) {
        const demoUser = mapUser(buildDemoUser(getDemoRole()));
        setToken('demo-token');
        setUser(demoUser);
        setIsLoading(false);
        return;
      }

      const storedToken = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Validate token by calling /me
          const { data } = await api.get('/auth/me');
          const validatedUser = mapUser(data);
          setToken(storedToken);
          setUser(validatedUser);
          sessionStorage.setItem('user', JSON.stringify(validatedUser));
        } catch {
          // Token invalid — clear storage
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (newToken: string, refreshToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('refresh_token', refreshToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (isDemoMode()) {
      exitDemo();
      window.location.href = '/landing';
      return;
    }
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Yuklanmoqda...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
