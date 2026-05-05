import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tokenStore } from '../lib/api';
import { authService } from '../services/studentService';
import { clearAll as clearOfflineCache } from '../lib/swrCache';
import { stopDemoMode } from '../lib/demoMode';
import type { UserBrief } from '../lib/types';

interface AuthContextValue {
  user: UserBrief | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokenStore.get()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    setError(null);
    try {
      const res = await authService.login(email, password);
      tokenStore.set(res.access_token);
      tokenStore.setRefresh(res.refresh_token);
      setUser(res.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }

  async function loginWithPhone(phone: string, code: string) {
    setError(null);
    try {
      const res = await authService.verifyPhoneOtp(phone, code);
      tokenStore.set(res.access_token);
      tokenStore.setRefresh(res.refresh_token);
      setUser(res.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }

  function logout() {
    tokenStore.clear();
    // Drop demo flag too, otherwise logout from a demo session would loop
    // straight back into the demo on the login screen reload.
    stopDemoMode();
    // Wipe cached schedule/rewards/etc so a different student logging in
    // on the same device never sees the previous one's data.
    clearOfflineCache();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, loginWithPhone, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
