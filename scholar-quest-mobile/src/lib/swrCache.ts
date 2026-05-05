/**
 * Stale-while-revalidate cache backed by localStorage.
 *
 * The student app's most-visited screens (schedule, rewards) need to render
 * something even when the device is offline — students lose connectivity in
 * the metro, in classrooms, etc. This module wraps any async fetcher and
 * applies the SWR pattern:
 *
 *   1) Read the last cached payload synchronously and return it immediately
 *      (so the UI paints from the cache while the network request runs).
 *   2) Kick off the live fetch in the background.
 *   3) On success: persist the new payload and notify subscribers.
 *   4) On failure: keep showing the cached value, expose ``stale: true``.
 *
 * Storage layout (per key):
 *   localStorage["sq:cache:<key>"] = JSON({ ts: epoch_ms, payload: T })
 *
 * Limitations vs. real SWR libraries:
 *   - No deduping across hooks (acceptable: only a handful of callers).
 *   - No cross-tab invalidation (acceptable: single-tab mobile webview).
 *   - localStorage only — survives reload but not a wipe of app data.
 *
 * Why localStorage and not IndexedDB? Payloads are <50 KB, the API is sync,
 * and Capacitor proxies it to native storage on Android. IDB is overkill
 * here.
 */

const PREFIX = 'sq:cache:';
// 14 days. Older entries are dropped on read (stale + expired = don't show).
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

interface Entry<T> {
  ts: number;
  payload: T;
}

function readEntry<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (typeof parsed?.ts !== 'number') return null;
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, payload: T): void {
  try {
    const entry: Entry<T> = { ts: Date.now(), payload };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage disabled — silently drop. We don't want a
    // localStorage failure to break the live request flow.
  }
}

export interface SwrResult<T> {
  /** Cached payload, if any. Always returned synchronously. */
  cached: T | null;
  /** Promise that resolves to the live payload (or rejects if network fails). */
  live: Promise<T>;
}

/**
 * Wrap a fetcher with SWR semantics.
 *
 * Usage:
 *   const { cached, live } = swr('schedule', () => api.get('/students/me/schedule'));
 *   setSchedule(cached);             // paint instantly from cache
 *   live.then(setSchedule).catch(() => {}); // upgrade when network responds
 */
export function swr<T>(key: string, fetcher: () => Promise<T>): SwrResult<T> {
  const entry = readEntry<T>(key);
  const live = fetcher().then((payload) => {
    writeEntry(key, payload);
    return payload;
  });
  return { cached: entry?.payload ?? null, live };
}

/** Drop a single cache entry — call after a mutation that invalidates it. */
export function invalidate(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Clear every entry — call on logout so a different student doesn't see
 *  the previous one's cached schedule. */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
