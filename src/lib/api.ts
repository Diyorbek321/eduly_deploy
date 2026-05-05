import axios, { AxiosAdapter, AxiosResponse } from 'axios';
import { isDemoMode, getDemoResponse } from './demoData';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: RAW_BASE,
  headers: { 'Content-Type': 'application/json' },
  // Send the HttpOnly auth cookies set by the backend on login/refresh so we
  // can migrate away from sessionStorage Bearer tokens at our own pace.
  // Backend keeps accepting Authorization headers as the primary auth method.
  withCredentials: true,
});

// axios 1.x stores `defaults.adapter` as an array of adapter names (e.g. ['xhr','http','fetch']),
// not a callable. Resolve it to a real adapter function via getAdapter so the demoAdapter can
// fall through to the real network adapter when demo mode is off.
const defaultAdapter = axios.getAdapter(api.defaults.adapter) as AxiosAdapter;

const demoAdapter: AxiosAdapter = (config) => {
  if (!isDemoMode()) {
    return defaultAdapter(config);
  }
  let parsedData: unknown = config.data;
  if (typeof parsedData === 'string') {
    try { parsedData = JSON.parse(parsedData); } catch { /* leave as-is */ }
  }
  const data = getDemoResponse({
    url: config.url ?? '',
    method: (config.method ?? 'get').toLowerCase(),
    data: parsedData,
  });
  const response: AxiosResponse = {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
  return Promise.resolve(response);
};

api.defaults.adapter = demoAdapter;

// Attach JWT token and normalize URL to avoid trailing-slash redirects
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Ensure URL ends with "/" so FastAPI doesn't 307-redirect and strip the
  // Authorization header when the redirect points at the backend origin.
  // Auth endpoints are declared WITHOUT a trailing slash in FastAPI, so
  // appending one causes the inverse 307 redirect — which strips the POST
  // body and yields a spurious 401. Skip them.
  const NO_SLASH_PATHS = [
    '/auth/login', '/auth/refresh', '/auth/logout', '/auth/register', '/auth/me', '/auth/change-password',
    // Teacher dashboard routes are declared in FastAPI without a trailing slash;
    // appending "/" forces a 307 redirect which can strip Authorization or surface
    // as a NetworkError depending on browser/proxy. Skip the slash for these.
    '/teacher/stats', '/teacher/profile', '/teacher/profile/password',
    '/teacher/attendance/bulk', '/teacher/attendance-stats', '/teacher/my-salaries',
    // Admin dashboard + student stats routes are also declared without trailing slash.
    // Same 307/NetworkError symptom as the teacher routes — fired right after admin login.
    '/dashboard/stats', '/dashboard/revenue-chart', '/dashboard/attendance-chart',
    '/student/stats',
  ];
  const NO_SLASH_PREFIXES = [
    '/teacher/my-groups/', // matches /teacher/my-groups/123/students etc.
    '/dashboard/',         // catches any future /dashboard/* endpoints
  ];
  const pathOnly = (config.url ?? '').split('?')[0];
  const skipSlash =
    NO_SLASH_PATHS.some((p) => pathOnly === p || pathOnly.endsWith(p)) ||
    NO_SLASH_PREFIXES.some((p) => pathOnly.includes(p));
  if (!skipSlash) {
    if (config.url && !config.url.includes('?') && !config.url.endsWith('/')) {
      config.url += '/';
    } else if (config.url && config.url.includes('?') && !config.url.split('?')[0].endsWith('/')) {
      const [path, query] = config.url.split('?');
      config.url = `${path}/?${query}`;
    }
  }
  return config;
});

// Track whether a refresh is in progress to avoid duplicate calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

// Unwrap the backend response envelope {success, data, error} → data
// and on envelope-level errors, reject so callers' catch() runs.
api.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    if (body.success) {
      response.data = body.data;
    } else {
      const msg = body.error?.message || 'Request failed';
      return Promise.reject(Object.assign(new Error(msg), { response }));
    }
  }
  return response;
});

// On 401, try to refresh the token once before redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Unwrap envelope on error responses too, so error.response.data.detail works
    const body = error.response?.data;
    if (body && typeof body === 'object' && 'success' in body && body.success === false) {
      error.response.data = { detail: body.error?.message, code: body.error?.code };
    }
    const originalRequest = error.config;

    // Skip refresh for login/refresh endpoints or already-retried requests
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem('refresh_token');
    if (!refreshToken) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data: raw } = await axios.post('/api/auth/refresh/', {
        refresh_token: refreshToken,
      });
      const data = raw && typeof raw === 'object' && 'success' in raw && 'data' in raw ? raw.data : raw;
      sessionStorage.setItem('token', data.access_token);
      sessionStorage.setItem('refresh_token', data.refresh_token);
      processQueue(null, data.access_token);
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
