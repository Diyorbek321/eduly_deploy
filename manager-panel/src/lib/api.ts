/**
 * Manager Panel API — same as admin panel api.ts but uses mp_token
 * and redirects to /manager/login on 401.
 */
import axios from 'axios';

const RAW_BASE = '/api';

const api = axios.create({
  baseURL: RAW_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT token and normalize trailing slashes
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('mp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const NO_SLASH_PATHS = [
    '/auth/login', '/auth/refresh', '/auth/logout', '/auth/register',
    '/auth/me', '/auth/change-password',
    '/dashboard/stats', '/dashboard/revenue-chart', '/dashboard/attendance-chart',
  ];

  const pathOnly = (config.url ?? '').split('?')[0];
  const skipSlash = NO_SLASH_PATHS.some(p => pathOnly === p || pathOnly.endsWith(p));

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

// Unwrap backend response envelope {success, data, error} → data
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

// On 401 redirect to manager login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const body = error.response?.data;
    if (body && typeof body === 'object' && 'success' in body && body.success === false) {
      error.response.data = { detail: body.error?.message, code: body.error?.code };
    }

    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        sessionStorage.removeItem('mp_token');
        sessionStorage.removeItem('mp_user');
        window.location.href = '/manager/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
