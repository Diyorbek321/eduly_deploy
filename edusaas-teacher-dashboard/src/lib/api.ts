import axios from 'axios';

const RAW_BASE = ((import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: RAW_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend wraps responses as { success, data, error }. Unwrap to `.data`.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      if (body.success) {
        response.data = body.data;
      } else {
        return Promise.reject(new Error(body.error?.message || 'Xatolik'));
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const base = ((import.meta as any).env?.BASE_URL ?? '/').replace(/\/+$/, '/');
      const loginPath = `${base === '/' ? '' : base}login`.replace(/\/+/g, '/') || '/login';
      if (!currentPath.endsWith('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = loginPath.startsWith('/') ? loginPath : `/${loginPath}`;
      }
    }
    const msg = error.response?.data?.error?.message
      || error.response?.data?.detail
      || error.message;
    return Promise.reject(new Error(msg));
  }
);
