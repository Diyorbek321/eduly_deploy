/**
 * Demo / offline-first runtime for the standalone APK.
 *
 * The app needs to ship as an installable APK that customers can try
 * BEFORE the backend is publicly deployed. So we let the student tap
 * "Demo sifatida ko'rish" on the login screen and get a fully populated
 * version of the app with realistic mock data — no network required.
 *
 * When demo mode is on, ``api.apiRequest`` short-circuits and returns
 * synthetic responses from this module instead of hitting the backend.
 * Demo mode persists in localStorage so navigating between pages and
 * relaunching the app keep working without re-arming.
 */

import type {
  LoginResponse,
  MyAttendance,
  MyPayments,
  MyProfile,
  MySchedule,
  UserBrief,
} from './types';

export const DEMO_FLAG_KEY = 'sq_demo_mode';

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function startDemoMode(): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, 'true');
    // Demo runs need a non-empty token so the auth interceptor doesn't try
    // to log out. The value is never sent to a real backend.
    localStorage.setItem('sq_access_token', 'demo-access-token');
    localStorage.setItem('sq_refresh_token', 'demo-refresh-token');
  } catch {
    /* ignore */
  }
}

export function stopDemoMode(): void {
  try {
    localStorage.removeItem(DEMO_FLAG_KEY);
    localStorage.removeItem('sq_access_token');
    localStorage.removeItem('sq_refresh_token');
  } catch {
    /* ignore */
  }
}

// ── Mock payloads ───────────────────────────────────────────────────────────

const DEMO_USER: UserBrief = {
  id: 9001,
  email: 'demo@scholarquest.app',
  role: 'STUDENT',
  is_active: true,
  name: 'Demo Talaba',
  student_id: 9001,
  teacher_id: null,
};

const DEMO_PROFILE: MyProfile = {
  id: 9001,
  name: 'Demo Talaba',
  phone: '+998 90 000 00 00',
  gender: 'Erkak',
  birth_date: '2007-09-12',
  address: "Toshkent sh., Yunusobod t.",
  parent_name: 'Ota Demo',
  parent_phone: '+998 90 111 11 11',
  avatar: null,
  status: 'Faol',
  debt: 0,
  paid: 1_200_000,
  group_names: ['IELTS Intensive 7.0', "Matematika Olimpiada"],
  homework_strikes: 0,
  created_at: '2026-03-01T08:00:00',
};

const DEMO_SCHEDULE: MySchedule = {
  items: [
    {
      group_id: 1, group_name: 'IELTS Intensive 7.0', course_name: 'IELTS',
      teacher_name: 'Aziza Karimova', schedule: 'Du-Pa-Cho', time: '14:00 – 16:00',
      room: '203', status: 'enrolled', enrolled_at: '2026-04-15T09:00:00',
    },
    {
      group_id: 2, group_name: "Matematika Olimpiada", course_name: 'Matematika',
      teacher_name: 'Bobur Aliyev', schedule: 'Se-Pay', time: '17:00 – 19:00',
      room: '105', status: 'enrolled', enrolled_at: '2026-04-15T09:00:00',
    },
  ],
  total: 2, page: 1, pages: 1,
};

const DEMO_ATTENDANCE: MyAttendance = {
  items: [
    { id: 1, group_id: 1, group_name: 'IELTS Intensive 7.0', date: '2026-05-02', status: 'present', note: null },
    { id: 2, group_id: 2, group_name: "Matematika Olimpiada", date: '2026-05-01', status: 'present', note: null },
    { id: 3, group_id: 1, group_name: 'IELTS Intensive 7.0', date: '2026-04-29', status: 'late', note: '15 daqiqa kech' },
    { id: 4, group_id: 2, group_name: "Matematika Olimpiada", date: '2026-04-28', status: 'absent', note: null },
    { id: 5, group_id: 1, group_name: 'IELTS Intensive 7.0', date: '2026-04-26', status: 'present', note: null },
  ],
  total: 5, page: 1, pages: 1,
  present_count: 18, absent_count: 1, late_count: 2, excused_count: 0,
};

const DEMO_PAYMENTS: MyPayments = {
  items: [
    { id: 1, amount: 600_000, method: 'Click', status: 'paid', date: '2026-04-15T10:00:00', note: 'Aprel oyi' },
    { id: 2, amount: 600_000, method: 'Payme', status: 'paid', date: '2026-03-15T10:00:00', note: 'Mart oyi' },
  ],
  total: 2, page: 1, pages: 1, total_paid: 1_200_000, current_debt: 0,
};

const DEMO_REWARDS = [
  { id: 1, name: 'Brandlangan daftar', cost: 60, stock: 8, image: null, is_active: true },
  { id: 2, name: 'Eduly futbolka', cost: 250, stock: 4, image: null, is_active: true },
  { id: 3, name: 'AirPods Pro', cost: 1200, stock: 1, image: null, is_active: true },
  { id: 4, name: "1 oy bepul o'qish", cost: 800, stock: 3, image: null, is_active: true },
];

const DEMO_WALLET = { student_id: 9001, student_name: 'Demo Talaba', coins: 340 };

const DEMO_PURCHASES: Array<Record<string, unknown>> = [
  { id: 1, student_id: 9001, student_name: 'Demo Talaba', reward_id: 1, reward_name: 'Brandlangan daftar', cost: 60, status: 'PENDING', created_at: '2026-04-29T14:00:00' },
];

export function demoLoginResponse(): LoginResponse {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    user: DEMO_USER,
  };
}

/**
 * Resolve a synthetic response for any API path the app calls. Returns
 * ``undefined`` if the path is unknown — caller should treat that as a
 * 404-shaped error in demo mode.
 */
export function getDemoResponse(path: string, method: string): unknown | undefined {
  // Strip /api prefix if present, drop trailing slash, drop query string.
  const p = path
    .replace(/^\/api/, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '') || '/';
  const m = method.toUpperCase();

  if (p === '/auth/me') return DEMO_USER;
  if (p === '/auth/login' && m === 'POST') return demoLoginResponse();
  if (p === '/auth/logout') return { message: 'OK' };
  if (p === '/auth/phone/request' || p === '/auth/password/reset/request') {
    return { message: "Demo rejimida SMS yuborilmaydi. Kod: 000000" };
  }
  if (p === '/auth/phone/verify') return demoLoginResponse();
  if (p === '/auth/password/reset/confirm') {
    return { message: "Demo: parol o'zgartirildi" };
  }

  if (p === '/students/me') return DEMO_PROFILE;
  if (p === '/students/me/schedule') return DEMO_SCHEDULE;
  if (p === '/students/me/attendance') return DEMO_ATTENDANCE;
  if (p === '/students/me/payments') return DEMO_PAYMENTS;

  if (p === '/rewards') return DEMO_REWARDS;
  if (p === '/rewards/wallets/me') return DEMO_WALLET;
  if (p === '/rewards/purchases') return DEMO_PURCHASES;
  if (p === '/rewards/purchases/me' && m === 'POST') {
    return {
      id: Date.now(), student_id: 9001, student_name: 'Demo Talaba',
      reward_id: 0, reward_name: '(demo)', cost: 0, status: 'PENDING',
      created_at: new Date().toISOString(),
    };
  }

  return undefined;
}
