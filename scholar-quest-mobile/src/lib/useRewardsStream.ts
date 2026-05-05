import { useEffect, useRef, useState } from 'react';
import { tokenStore } from './api';

type ConnectionState = 'connecting' | 'open' | 'polling' | 'lost';

interface Options {
  /** Called on every reward.* / purchase.* event. Throttle inside if needed. */
  onEvent: () => void;
  /** Polling interval (ms) when SSE is unavailable. */
  pollMs?: number;
  /** SSE drop threshold before falling back to polling. */
  maxDrops?: number;
  /** Window (ms) over which `maxDrops` counts. */
  dropWindowMs?: number;
}

/**
 * Subscribes to /api/rewards/stream via EventSource. On reward.* or
 * purchase.* events, calls `onEvent` so the page can refetch.
 *
 * Falls back to polling when the connection drops `maxDrops` times within
 * `dropWindowMs`. Surfaces a `connectionState` ('open' / 'polling' / 'lost')
 * for "connection lost" UI.
 *
 * Auth: EventSource uses cookies (set by /auth/login). The backend also
 * accepts Bearer via Authorization header, but EventSource cannot set
 * arbitrary headers — so the access token is also passed as a query string
 * on the URL as a fallback for clients that haven't migrated to cookies.
 */
export function useRewardsStream({
  onEvent,
  pollMs = 30_000,
  maxDrops = 3,
  dropWindowMs = 60_000,
}: Options): { state: ConnectionState } {
  const [state, setState] = useState<ConnectionState>('connecting');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: number | null = null;
    let cancelled = false;
    let drops: number[] = [];

    const startPolling = () => {
      if (pollTimer != null) return;
      setState('polling');
      const tick = () => {
        if (cancelled) return;
        onEventRef.current();
      };
      pollTimer = window.setInterval(tick, pollMs);
    };

    const stopPolling = () => {
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connect = () => {
      if (cancelled) return;

      const token = tokenStore.get();
      const url = token
        ? `/api/rewards/stream?token=${encodeURIComponent(token)}`
        : '/api/rewards/stream';

      try {
        es = new EventSource(url, { withCredentials: true });
      } catch {
        startPolling();
        return;
      }

      setState('connecting');

      es.addEventListener('hello', () => {
        stopPolling();
        setState('open');
      });

      const handle = () => onEventRef.current();
      es.addEventListener('reward.created', handle);
      es.addEventListener('reward.updated', handle);
      es.addEventListener('reward.deleted', handle);
      es.addEventListener('purchase.created', handle);
      es.addEventListener('purchase.updated', handle);

      es.onerror = () => {
        if (cancelled) return;
        setState('lost');

        const now = Date.now();
        drops = drops.filter((t) => now - t < dropWindowMs);
        drops.push(now);

        es?.close();
        es = null;

        if (drops.length >= maxDrops) {
          // Too flaky — fall back to polling and don't try SSE again
          // until the page remounts.
          startPolling();
          return;
        }
        // Backoff and retry SSE.
        const delay = Math.min(1000 * 2 ** drops.length, 10_000);
        window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      es?.close();
      stopPolling();
    };
  }, [pollMs, maxDrops, dropWindowMs]);

  return { state };
}
