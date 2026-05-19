import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { isNativePlatform } from '../lib/platform';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

interface PushContextValue {
  permission: PushPermission;
  token: string | null;
  error: string | null;
  requestPermission: () => Promise<void>;
}

const PushContext = createContext<PushContextValue | undefined>(undefined);

// Push registration requires a Firebase google-services.json. Without it,
// PushNotifications.register() throws a native FirebaseMessaging error that
// bypasses JS try/catch and crashes the app. Gate registration behind an
// explicit env flag — set VITE_PUSH_ENABLED=1 only when Firebase is wired up.
const PUSH_ENABLED =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_PUSH_ENABLED === '1';

async function registerTokenWithBackend(token: string, platform: string): Promise<void> {
  try {
    await api.post('/users/me/push-token', { token, platform });
  } catch {
    // Backend endpoint is optional. Silently ignore.
  }
}

export function PushProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>(
    isNativePlatform() ? 'prompt' : 'unsupported',
  );
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestPermission() {
    if (!isNativePlatform() || !PUSH_ENABLED) {
      setPermission('unsupported');
      return;
    }
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      await PushNotifications.register();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push registration failed');
    }
  }

  useEffect(() => {
    if (!isNativePlatform() || !user || !PUSH_ENABLED) return;
    let removeListeners: Array<() => void> = [];
    (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const registration = await PushNotifications.addListener('registration', (t) => {
        setToken(t.value);
        void registerTokenWithBackend(t.value, Capacitor.getPlatform());
      });
      const regError = await PushNotifications.addListener('registrationError', (err) => {
        setError(String(err.error ?? 'Unknown registration error'));
      });
      const received = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notif) => {
          console.info('[push] received', notif);
        },
      );
      const tapped = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          console.info('[push] tapped', action);
        },
      );
      removeListeners = [
        () => registration.remove(),
        () => regError.remove(),
        () => received.remove(),
        () => tapped.remove(),
      ];
      const current = await PushNotifications.checkPermissions();
      if (current.receive === 'granted') {
        setPermission('granted');
        await PushNotifications.register();
      } else if (current.receive === 'denied') {
        setPermission('denied');
      } else {
        await requestPermission();
      }
    })().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Push init failed');
    });
    return () => {
      removeListeners.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <PushContext.Provider value={{ permission, token, error, requestPermission }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error('usePush must be used within a PushProvider');
  return ctx;
}
