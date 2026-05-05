import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/src/lib/api';
import { useAuth } from './AuthContext';

export interface CenterSettings {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  working_hours: string | null;
  timezone: string;
  language: string;
}

interface SettingsContextType {
  center: CenterSettings | null;
  refresh: () => Promise<void>;
  setCenter: (c: CenterSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [center, setCenter] = useState<CenterSettings | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCenter(null);
      return;
    }
    try {
      const { data } = await api.get('/settings');
      setCenter(data);
    } catch {
      // Non-fatal — settings are optional for UI.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ center, refresh, setCenter }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
