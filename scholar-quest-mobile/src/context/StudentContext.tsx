import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { studentService } from '../services/studentService';
import type {
  MyAttendance,
  MyPayments,
  MyProfile,
  MySchedule,
} from '../lib/types';
import { useAuth } from './AuthContext';
import { swr } from '../lib/swrCache';

interface StudentContextValue {
  profile: MyProfile | null;
  schedule: MySchedule | null;
  attendance: MyAttendance | null;
  payments: MyPayments | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined);

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [schedule, setSchedule] = useState<MySchedule | null>(null);
  const [attendance, setAttendance] = useState<MyAttendance | null>(null);
  const [payments, setPayments] = useState<MyPayments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user || user.role !== 'STUDENT') return;
    // Stale-while-revalidate: paint cached data instantly (so offline /
    // slow-network users see something), then upgrade once the live calls
    // resolve. Cache key is namespaced by user id so a different student on
    // the same device never sees the previous one's data.
    const ns = `u${user.id}`;
    const swrProfile = swr<MyProfile>(`${ns}:profile`, () => studentService.profile());
    const swrSchedule = swr<MySchedule>(`${ns}:schedule`, () => studentService.schedule({ limit: 50 }));
    const swrAttendance = swr<MyAttendance>(`${ns}:attendance`, () => studentService.attendance({ limit: 50 }));
    const swrPayments = swr<MyPayments>(`${ns}:payments`, () => studentService.payments({ limit: 50 }));

    if (swrProfile.cached) setProfile(swrProfile.cached);
    if (swrSchedule.cached) setSchedule(swrSchedule.cached);
    if (swrAttendance.cached) setAttendance(swrAttendance.cached);
    if (swrPayments.cached) setPayments(swrPayments.cached);

    // Loading flag only blocks the UI when no cache exists.
    const hasAnyCache = Boolean(
      swrProfile.cached || swrSchedule.cached || swrAttendance.cached || swrPayments.cached,
    );
    setLoading(!hasAnyCache);
    setError(null);

    try {
      const [p, s, a, pay] = await Promise.all([
        swrProfile.live,
        swrSchedule.live,
        swrAttendance.live,
        swrPayments.live,
      ]);
      setProfile(p);
      setSchedule(s);
      setAttendance(a);
      setPayments(pay);
    } catch (err) {
      // Cache served the UI; surface the error but don't blank the page.
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      void refresh();
    } else {
      setProfile(null);
      setSchedule(null);
      setAttendance(null);
      setPayments(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <StudentContext.Provider
      value={{ profile, schedule, attendance, payments, loading, error, refresh }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used within a StudentProvider');
  return ctx;
}
