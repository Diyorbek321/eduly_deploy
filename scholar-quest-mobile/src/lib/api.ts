import { isDemoMode, getDemoResponse } from './demoMode';

const TOKEN_KEY = 'sq_access_token';
const REFRESH_KEY = 'sq_refresh_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_KEY, token),
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface EnvelopeSuccess<T> {
  success: true;
  data: T;
  error: null;
}

interface EnvelopeError {
  success: false;
  data: null;
  error: { message: string; code: string };
}

type Envelope<T> = EnvelopeSuccess<T> | EnvelopeError;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  form?: Record<string, string>;
  query?: Record<string, string | number | undefined | null>;
}

// Resolution order for the backend base URL:
//   1) Runtime override (Settings page → localStorage). Lets ops change the
//      target without rebuilding the APK.
//   2) Build-time VITE_API_BASE_URL (set via .env or CI when the APK is
//      compiled for a specific environment).
//   3) Capacitor native default — Android emulator's loopback to host.
//   4) Browser default — Vite proxy at /api (dev) or same origin (prod web).
const RUNTIME_BASE_URL_KEY = 'sq_api_base_url';

function resolveApiBaseUrl(): string {
  try {
    const override = localStorage.getItem(RUNTIME_BASE_URL_KEY);
    if (override) return override.replace(/\/$/, '');
  } catch {
    /* ignore */
  }
  const envBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  const isNative =
    typeof window !== 'undefined' &&
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  if (isNative) return 'http://10.0.2.2:8000';
  return '';
}

// Cached at module load — refreshes on a hard reload or after ``setApiBaseUrl``.
let API_BASE_URL: string = resolveApiBaseUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  const cleaned = (url || '').trim().replace(/\/$/, '');
  try {
    if (cleaned) localStorage.setItem(RUNTIME_BASE_URL_KEY, cleaned);
    else localStorage.removeItem(RUNTIME_BASE_URL_KEY);
  } catch {
    /* ignore */
  }
  API_BASE_URL = resolveApiBaseUrl();
}

// FastAPI is strict about trailing slashes: routes declared as `/` redirect
// (307) when called without one. In a browser the redirect becomes a
// cross-origin hop that strips Authorization → "NetworkError". Default to
// appending a trailing slash, with an opt-out list for routes declared
// without one (auth, sub-paths under /students/me, etc.).
const NO_TRAILING_SLASH_PATHS: ReadonlyArray<string> = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/me',
  '/auth/register',
  '/auth/change-password',
  '/students/me/schedule',
  '/students/me/attendance',
  '/students/me/payments',
  '/rewards/wallets',
  '/rewards/wallets/me',
  '/rewards/purchases',
  '/rewards/purchases/me',
  '/rewards/stream',
];

function withTrailingSlash(pathname: string): string {
  if (pathname.endsWith('/')) return pathname;
  const apiIdx = pathname.indexOf('/api/');
  const route = apiIdx >= 0 ? pathname.slice(apiIdx + 4) : pathname;
  for (const exact of NO_TRAILING_SLASH_PATHS) {
    if (route === exact) return pathname;
    if (route.startsWith(`${exact}/`)) return pathname;
  }
  return `${pathname}/`;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const relative = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  const [pathname, queryFromPath] = relative.split('?', 2);
  const normalizedPath = withTrailingSlash(pathname);
  const url = `${API_BASE_URL}${normalizedPath}`;
  const params = new URLSearchParams(queryFromPath ?? '');
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function onUnauthorized() {
  tokenStore.clear();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, form, query }: RequestOptions = {},
): Promise<T> {
  // Demo mode: short-circuit before touching the network so the APK works
  // standalone (no backend deployment required for trial users).
  if (isDemoMode()) {
    const demo = getDemoResponse(path, method);
    if (demo !== undefined) {
      return demo as T;
    }
    throw new ApiError(`Demo: endpoint ${method} ${path} mavjud emas`, 404);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (form) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(form)) sp.append(k, v);
    payload = sp;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload,
  });

  let envelope: Envelope<T> | null = null;
  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      envelope = null;
    }
  }

  const isAuthEndpoint = path.startsWith('/auth/') || path.startsWith('/api/auth/');

  if (response.status === 401 && !isAuthEndpoint) {
    onUnauthorized();
    const message = envelope && envelope.success === false
      ? envelope.error.message
      : 'Session expired';
    throw new ApiError(message, 401, 'UNAUTHORIZED');
  }

  if (!response.ok || (envelope && envelope.success === false)) {
    const message = envelope && envelope.success === false
      ? envelope.error.message
      : `Request failed (${response.status})`;
    const code = envelope && envelope.success === false ? envelope.error.code : undefined;
    throw new ApiError(message, response.status, code);
  }

  if (!envelope) {
    throw new ApiError('Empty response', response.status);
  }

  return envelope.data;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) =>
    apiRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: Record<string, string>) =>
    apiRequest<T>(path, { method: 'POST', form }),
};
