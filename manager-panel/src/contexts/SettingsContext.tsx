import React, { createContext, useContext } from 'react';
interface SettingsCtx { center: { name: string; logo?: string } | null; }
const Ctx = createContext<SettingsCtx>({ center: null });
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ center: null }}>{children}</Ctx.Provider>;
}
export function useSettings() { return useContext(Ctx); }
