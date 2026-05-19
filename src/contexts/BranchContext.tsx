import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/src/lib/api';
import { useAuth } from './AuthContext';

export interface Branch {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  status: string;
  role: string;
  created_at: string;
}

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (branch: Branch | null) => void;
  isMultiBranch: boolean;
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      setBranches([]);
      setActiveBranchState(null);
      return;
    }

    const fetchBranches = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/branches/');
        const list: Branch[] = Array.isArray(data) ? data : (data.data ?? []);
        setBranches(list);

        const savedId = localStorage.getItem('activeBranchId');
        if (savedId && list.length > 1) {
          const found = list.find((b) => b.id === Number(savedId));
          setActiveBranchState(found ?? list[0] ?? null);
        } else {
          setActiveBranchState(list[0] ?? null);
        }
      } catch {
        // Non-critical — single-branch admins may not have access grants
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [isAuthenticated, user?.role]);

  const setActiveBranch = (branch: Branch | null) => {
    setActiveBranchState(branch);
    if (branch) {
      localStorage.setItem('activeBranchId', String(branch.id));
    } else {
      localStorage.removeItem('activeBranchId');
    }
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        setActiveBranch,
        isMultiBranch: branches.length > 1,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
