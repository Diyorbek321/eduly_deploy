import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('mp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => {
    // Unwrap standard envelope { success, data }
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      res.data = res.data.data ?? res.data;
    }
    return res;
  },
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('mp_token');
      sessionStorage.removeItem('mp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
