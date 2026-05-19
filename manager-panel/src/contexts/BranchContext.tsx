import React, { createContext, useContext } from 'react';

export interface Branch {
  id: number; name: string; slug: string;
  phone: string | null; address: string | null;
  status: string; role: string; created_at: string;
}

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (b: Branch | null) => void;
  isMultiBranch: boolean;
  loading: boolean;
}

const Ctx = createContext<BranchContextType>({
  branches: [], activeBranch: null,
  setActiveBranch: () => {}, isMultiBranch: false, loading: false,
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  return (
    <Ctx.Provider value={{ branches: [], activeBranch: null, setActiveBranch: () => {}, isMultiBranch: false, loading: false }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBranch() { return useContext(Ctx); }
