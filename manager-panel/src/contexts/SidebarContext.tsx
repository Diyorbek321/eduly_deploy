import React, { createContext, useContext } from 'react';
interface SidebarCtx { mobileOpen: boolean; open: () => void; close: () => void; }
const Ctx = createContext<SidebarCtx>({ mobileOpen: false, open: () => {}, close: () => {} });
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ mobileOpen: false, open: () => {}, close: () => {} }}>{children}</Ctx.Provider>;
}
export function useSidebar() { return useContext(Ctx); }
