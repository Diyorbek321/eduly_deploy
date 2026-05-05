/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Role, User } from "../types";
import { api, getToken, setToken } from "../lib/superAdminApi";

interface BackendUser {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  name?: string | null;
  center_id?: number | null;
}

interface LoginEnvelopeData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BackendUser;
}

const USER_KEY = "eduly_super_admin_user";

function toUser(u: BackendUser): User {
  return {
    id: String(u.id),
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    center_id: u.center_id != null ? String(u.center_id) : undefined,
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    const token = getToken();
    if (raw && token) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setError(null);
    // Backend expects OAuth2 form (username/password)
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    try {
      const res = await api.post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const env = res.data as { success: boolean; data: LoginEnvelopeData; error: unknown };
      if (!env.success || !env.data) {
        throw new Error("Login muvaffaqiyatsiz");
      }
      const data = env.data;
      if (data.user.role !== "SUPER_ADMIN") {
        throw new Error("Faqat SUPER_ADMIN ushbu panelga kirishi mumkin");
      }
      setToken(data.access_token);
      const u = toUser(data.user);
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response
          ?.data?.error?.message ||
        (err instanceof Error ? err.message : "Login muvaffaqiyatsiz");
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
