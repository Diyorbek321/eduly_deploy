import React, { createContext, useCallback, useContext, useState } from 'react';

interface SidebarContextValue {
  mobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = useCallback(() => setMobileOpen(true), []);
  const close = useCallback(() => setMobileOpen(false), []);
  const toggle = useCallback(() => setMobileOpen((v) => !v), []);
  return (
    <SidebarContext.Provider value={{ mobileOpen, open, close, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return { mobileOpen: false, open: () => {}, close: () => {}, toggle: () => {} };
  }
  return ctx;
};
