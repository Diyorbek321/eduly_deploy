/**
 * Demo mode mock data + request dispatcher.
 * When demo mode is active, axios calls are short-circuited and resolved
 * against this module instead of hitting the real backend.
 *
 * Response shapes here must match what each page expects (some return
 * { items, total, pages }, others return raw arrays — see each handler).
 */

export type DemoRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export const DEMO_FLAG_KEY = 'demo_mode';
export const DEMO_ROLE_KEY = 'demo_role';

// Demo mode is a development/sales-pitch tool only. We kill it in production
// builds via VITE_ENABLE_DEMO_MODE. Three reasons:
//   1) ships mock student/teacher PII into the bundle
//   2) anyone who flips the sessionStorage flag bypasses real auth
//   3) confuses real customers who toggle it accidentally
//
// Default: enabled in `dev`, disabled everywhere else. Override explicitly
// with VITE_ENABLE_DEMO_MODE=true when needed (e.g., demo deploys).
const DEMO_BUILD_ENABLED: boolean = (() => {
  const env = (import.meta as unknown as { env?: Record<string, string | boolean> }).env ?? {};
  const explicit = env.VITE_ENABLE_DEMO_MODE;
  if (explicit !== undefined) return String(explicit).toLowerCase() === 'true';
  return env.DEV === true;
})();

export function isDemoModeAvailable(): boolean {
  return DEMO_BUILD_ENABLED;
}

export function isDemoMode(): boolean {
  if (!DEMO_BUILD_ENABLED) return false;
  return sessionStorage.getItem(DEMO_FLAG_KEY) === 'true';
}

export function getDemoRole(): DemoRole {
  const r = sessionStorage.getItem(DEMO_ROLE_KEY) as DemoRole | null;
  return r ?? 'ADMIN';
}

export function startDemo(role: DemoRole) {
  if (!DEMO_BUILD_ENABLED) {
    // Defense in depth: even if a stale UI calls startDemo in production, we
    // don't seed any sessionStorage state.
    return;
  }
  sessionStorage.setItem(DEMO_FLAG_KEY, 'true');
  sessionStorage.setItem(DEMO_ROLE_KEY, role);
  sessionStorage.setItem('token', 'demo-token');
  sessionStorage.setItem('refresh_token', 'demo-refresh');
  sessionStorage.setItem('user', JSON.stringify(buildDemoUser(role)));
}

export function exitDemo() {
  sessionStorage.removeItem(DEMO_FLAG_KEY);
  sessionStorage.removeItem(DEMO_ROLE_KEY);
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user');
}

export function buildDemoUser(role: DemoRole) {
  switch (role) {
    case 'ADMIN':
      return { id: 1, email: 'admin@demo.eduly.uz', role: 'ADMIN', name: 'Demo Admin' };
    case 'TEACHER':
      return { id: 2, email: 'teacher@demo.eduly.uz', role: 'TEACHER', name: 'Aziz Karimov', teacher_id: 1 };
    case 'STUDENT':
      return { id: 3, email: 'student@demo.eduly.uz', role: 'STUDENT', name: 'Sardor Tursunov', student_id: 1 };
  }
}

// ---------- Seed data (backend-shape) ----------

const students = [
  { id: 1, name: 'Sardor Tursunov', full_name: 'Sardor Tursunov', phone: '+998901234567', group_names: ['Ingliz tili B1'], status: 'Faol', debt: 0, paid: 600000, birth_date: '2008-04-12', gender: 'Erkak', address: 'Toshkent, Chilonzor', parent_name: 'Anvar Tursunov', parent_phone: '+998907654321', avatar: null },
  { id: 2, name: 'Madina Soliyeva', full_name: 'Madina Soliyeva', phone: '+998912345678', group_names: ['Matematika 9-sinf'], status: 'Faol', debt: 200000, paid: 400000, birth_date: '2009-07-23', gender: 'Ayol', address: 'Toshkent, Yunusobod', parent_name: 'Bahodir Soliyev', parent_phone: '+998908765432', avatar: null },
  { id: 3, name: 'Javohir Rasulov', full_name: 'Javohir Rasulov', phone: '+998931112233', group_names: ['IT Boshlangich'], status: 'Kutishda', debt: 600000, paid: 0, birth_date: '2010-11-02', gender: 'Erkak', address: 'Toshkent, Mirzo Ulugbek', parent_name: 'Olim Rasulov', parent_phone: '+998901112233', avatar: null },
  { id: 4, name: 'Dilnoza Karimova', full_name: 'Dilnoza Karimova', phone: '+998941234567', group_names: ['Ingliz tili B1'], status: 'Faol', debt: 0, paid: 600000, birth_date: '2008-02-15', gender: 'Ayol', address: 'Toshkent, Sergeli', parent_name: 'Rustam Karimov', parent_phone: '+998901234567', avatar: null },
  { id: 5, name: 'Bobur Yusupov', full_name: 'Bobur Yusupov', phone: '+998951234567', group_names: ['IT Boshlangich'], status: 'Muzlatilgan', debt: 0, paid: 800000, birth_date: '2007-09-10', gender: 'Erkak', address: 'Toshkent, Yakkasaroy', parent_name: 'Akmal Yusupov', parent_phone: '+998908765432', avatar: null },
  { id: 6, name: 'Shaxnoza Olimova', full_name: 'Shaxnoza Olimova', phone: '+998961234567', group_names: ['Matematika 9-sinf'], status: 'Faol', debt: 100000, paid: 500000, birth_date: '2009-12-05', gender: 'Ayol', address: 'Toshkent, Shaykhontohur', parent_name: 'Nodir Olimov', parent_phone: '+998907654321', avatar: null },
  { id: 7, name: 'Jasur Toshev', full_name: 'Jasur Toshev', phone: '+998971234567', group_names: ['IT Boshlangich'], status: 'Faol', debt: 0, paid: 800000, birth_date: '2008-05-22', gender: 'Erkak', address: 'Toshkent, Bektemir', parent_name: 'Ulugbek Toshev', parent_phone: '+998901111111', avatar: null },
  { id: 8, name: 'Aziza Rahimova', full_name: 'Aziza Rahimova', phone: '+998981234567', group_names: ['Ingliz tili B1'], status: 'Faol', debt: 50000, paid: 550000, birth_date: '2009-03-30', gender: 'Ayol', address: 'Toshkent, Olmazor', parent_name: 'Bekzod Rahimov', parent_phone: '+998902222222', avatar: null },
];

const teachers = [
  { id: 1, name: 'Aziz Karimov', full_name: 'Aziz Karimov', phone: '+998901111111', specialty: 'Ingliz tili', groups_count: 3, status: 'Faol', students_count: 36, rating: 4.8, salary: 6000000, hourly_rate: 60000, bonus: 500000, experience: '5 yil', birth_date: '1990-03-15', bio: 'CEFR C1, IELTS 8.0', hours: 24 },
  { id: 2, name: 'Nilufar Rashidova', full_name: 'Nilufar Rashidova', phone: '+998902222222', specialty: 'Matematika', groups_count: 2, status: 'Faol', students_count: 24, rating: 4.9, salary: 5500000, hourly_rate: 55000, bonus: 300000, experience: '7 yil', birth_date: '1988-06-20', bio: "Matematika o'qituvchisi, olimpiada g'olibi", hours: 18 },
  { id: 3, name: 'Otabek Mirzayev', full_name: 'Otabek Mirzayev', phone: '+998903333333', specialty: 'IT', groups_count: 2, status: 'Faol', students_count: 20, rating: 4.7, salary: 7000000, hourly_rate: 70000, bonus: 800000, experience: '4 yil', birth_date: '1992-11-08', bio: 'Full-stack dasturchi, ex-Google', hours: 16 },
];

const groups = [
  { id: 1, name: 'Ingliz tili B1', course_name: 'Ingliz tili', course_id: 1, level: 'B1', teacher_name: 'Aziz Karimov', teacher_id: 1, schedule: 'Du, Ch, Ju', time: '17:00-18:30', room: '101', room_id: 1, capacity: 15, students_count: 12, status: 'Faol' },
  { id: 2, name: 'Matematika 9-sinf', course_name: 'Matematika', course_id: 2, level: '9-sinf', teacher_name: 'Nilufar Rashidova', teacher_id: 2, schedule: 'Se, Pa, Sh', time: '15:00-16:30', room: '202', room_id: 2, capacity: 12, students_count: 10, status: 'Faol' },
  { id: 3, name: 'IT Boshlangich', course_name: 'IT', course_id: 3, level: 'Boshlangich', teacher_name: 'Otabek Mirzayev', teacher_id: 3, schedule: 'Du, Ch, Ju', time: '18:30-20:00', room: '303', room_id: 3, capacity: 14, students_count: 8, status: 'Qabul ochiq' },
];

const courses = [
  { id: 1, name: 'Ingliz tili', duration: '6 oy', price: 600000, lessons_count: 72, groups_count: 3, status: 'Faol', description: 'CEFR A1-C1 darajalarida ingliz tili kurslari' },
  { id: 2, name: 'Matematika', duration: '9 oy', price: 500000, lessons_count: 108, groups_count: 2, status: 'Faol', description: 'Maktab dasturi va olimpiada matematikasi' },
  { id: 3, name: 'IT', duration: '12 oy', price: 800000, lessons_count: 144, groups_count: 2, status: 'Faol', description: 'Web dasturlash, Python, JavaScript' },
];

const rooms = [
  { id: 1, name: '101', capacity: 15, status: 'Faol' },
  { id: 2, name: '202', capacity: 12, status: 'Faol' },
  { id: 3, name: '303', capacity: 14, status: 'Faol' },
  { id: 4, name: '404', capacity: 20, status: 'Faol' },
];

const payments = [
  { id: 1, student_id: 1, student_name: 'Sardor Tursunov', amount: 600000, method: 'Click', date: '2026-04-20T10:30:00Z', status: 'Muvaffaqiyatli', course: 'Ingliz tili B1' },
  { id: 2, student_id: 2, student_name: 'Madina Soliyeva', amount: 400000, method: 'Cash', date: '2026-04-18T14:15:00Z', status: 'Muvaffaqiyatli', course: 'Matematika 9-sinf' },
  { id: 3, student_id: 4, student_name: 'Dilnoza Karimova', amount: 600000, method: 'Payme', date: '2026-04-15T09:00:00Z', status: 'Muvaffaqiyatli', course: 'Ingliz tili B1' },
  { id: 4, student_id: 5, student_name: 'Bobur Yusupov', amount: 800000, method: 'Card', date: '2026-04-10T16:45:00Z', status: 'Muvaffaqiyatli', course: 'IT Boshlangich' },
  { id: 5, student_id: 6, student_name: 'Shaxnoza Olimova', amount: 500000, method: 'Click', date: '2026-04-08T11:20:00Z', status: 'Muvaffaqiyatli', course: 'Matematika 9-sinf' },
  { id: 6, student_id: 7, student_name: 'Jasur Toshev', amount: 800000, method: 'Payme', date: '2026-04-05T13:00:00Z', status: 'Muvaffaqiyatli', course: 'IT Boshlangich' },
];

const salaries = [
  { id: 1, teacher_id: 1, teacher_name: 'Aziz Karimov', month: '2026-04', base_amount: 6000000, bonus: 500000, total_amount: 6500000, is_paid: true, hours: 24 },
  { id: 2, teacher_id: 2, teacher_name: 'Nilufar Rashidova', month: '2026-04', base_amount: 5500000, bonus: 300000, total_amount: 5800000, is_paid: true, hours: 18 },
  { id: 3, teacher_id: 3, teacher_name: 'Otabek Mirzayev', month: '2026-04', base_amount: 7000000, bonus: 800000, total_amount: 7800000, is_paid: false, hours: 16 },
];

const dashboardStats = {
  total_students: 142,
  active_students: 128,
  total_teachers: 12,
  total_groups: 18,
  total_revenue: 285000000,
  total_debt: 4500000,
  monthly_revenue: 28500000,
  attendance_rate: 89,
};

const attendanceChart = {
  labels: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  data: [88, 92, 85, 90, 87, 78, 0],
};

const revenueChart = {
  labels: ['Yan', 'Fev', 'Mar', 'Apr'],
  data: [22000000, 24500000, 26800000, 28500000],
};

const teacherStats = {
  teacher_id: 1,
  teacher_name: 'Aziz Karimov',
  specialty: 'Ingliz tili',
  hourly_rate: 60000,
  groups_count: 3,
  total_students: 36,
  groups: [
    { id: 1, name: 'Ingliz tili B1', schedule: 'Du, Ch, Ju', time: '17:00-18:30', room: '101', capacity: 15, students_count: 12, course_name: 'Ingliz tili' },
    { id: 4, name: 'Ingliz tili A2', schedule: 'Se, Pa, Sh', time: '16:00-17:30', room: '102', capacity: 14, students_count: 11, course_name: 'Ingliz tili' },
    { id: 5, name: 'Ingliz tili IELTS', schedule: 'Du, Ch, Ju', time: '19:00-20:30', room: '103', capacity: 12, students_count: 13, course_name: 'Ingliz tili' },
  ],
};

const teacherSalaries = [
  { id: 1, month: '2026-04', base_amount: 6000000, bonus: 500000, total_amount: 6500000, is_paid: true, hours: 24, teacher_name: 'Aziz Karimov' },
  { id: 2, month: '2026-03', base_amount: 6000000, bonus: 400000, total_amount: 6400000, is_paid: true, hours: 22, teacher_name: 'Aziz Karimov' },
  { id: 3, month: '2026-02', base_amount: 6000000, bonus: 350000, total_amount: 6350000, is_paid: true, hours: 21, teacher_name: 'Aziz Karimov' },
];

const rewards = [
  { id: 1, name: 'Eduly daftari', cost: 50, stock: 20, image: null, description: 'Brendlangan daftar' },
  { id: 2, name: 'Sertifikat', cost: 100, stock: 50, image: null, description: 'Faxriy sertifikat' },
  { id: 3, name: 'Premium kurs', cost: 500, stock: 5, image: null, description: 'Bonus kurs' },
];

const rewardWallets = [
  { student_id: 1, student_name: 'Sardor Tursunov', balance: 320 },
  { student_id: 2, student_name: 'Madina Soliyeva', balance: 280 },
  { student_id: 4, student_name: 'Dilnoza Karimova', balance: 450 },
];

const smsTemplates = [
  { id: 1, name: "To'lov eslatmasi", text: "Hurmatli {ism}, oylik to'lov muddati yetib keldi.", category: "To'lov" },
  { id: 2, name: 'Davomat', text: 'Farzandingiz {ism} bugungi darsda qatnashmadi.', category: 'Davomat' },
  { id: 3, name: 'Xush kelibsiz', text: 'Eduly oilasiga xush kelibsiz, {ism}!', category: 'Boshqa' },
];

const smsHistory = [
  { id: 1, recipient: '+998901234567', message: "To'lov eslatmasi", status: 'Yuborildi', date: '2026-04-25T10:00:00Z' },
  { id: 2, recipient: '+998912345678', message: 'Davomat', status: 'Yuborildi', date: '2026-04-24T15:30:00Z' },
];

const settings = {
  center_name: 'Eduly Demo Markazi',
  address: 'Toshkent sh., Chilonzor t., Bunyodkor 12',
  phone: '+998 71 200-00-00',
  email: 'info@demo.eduly.uz',
  working_hours: '08:00 - 22:00',
  currency: 'UZS',
  language: 'uz',
};

const profile = {
  name: 'Demo Foydalanuvchi',
  email: 'demo@eduly.uz',
  phone: '+998901234567',
  avatar: null,
};

// ---------- Helpers ----------

function findStudent(id: number) {
  return students.find((s) => s.id === id) ?? students[0];
}
function findTeacher(id: number) {
  return teachers.find((t) => t.id === id) ?? teachers[0];
}
function findGroup(id: number) {
  return groups.find((g) => g.id === id) ?? groups[0];
}
function studentsInGroup(groupName: string) {
  return students.filter((s) => s.group_names.includes(groupName));
}

function paginated<T>(arr: T[], total = arr.length) {
  return { items: arr, total, pages: 1 };
}

// ---------- Dispatcher ----------

interface DemoRequest {
  url: string;
  method: string;
  data?: unknown;
}

export function getDemoResponse(req: DemoRequest): unknown {
  const fullUrl = req.url ?? '';
  const path = fullUrl.replace(/\/+$/, '').split('?')[0];
  const method = (req.method ?? 'get').toLowerCase();

  // ---- Auth ----
  if (path.endsWith('/auth/me')) return buildDemoUser(getDemoRole());
  if (path.endsWith('/auth/login')) {
    return {
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      user: buildDemoUser(getDemoRole()),
    };
  }
  if (path.endsWith('/auth/refresh')) return { access_token: 'demo-token', refresh_token: 'demo-refresh' };
  if (path.endsWith('/auth/change-password')) return { ok: true };

  // ---- Dashboard ----
  if (path.endsWith('/dashboard/stats')) return dashboardStats;
  if (path.endsWith('/dashboard/attendance-chart')) return attendanceChart;
  if (path.endsWith('/dashboard/revenue-chart')) return revenueChart;

  // ---- Students ----
  let m: RegExpMatchArray | null;
  if ((m = path.match(/\/students\/(\d+)\/attendances$/))) {
    return [
      { date: '2026-04-25', status: 'present', group_name: 'Ingliz tili B1' },
      { date: '2026-04-23', status: 'present', group_name: 'Ingliz tili B1' },
      { date: '2026-04-21', status: 'absent', group_name: 'Ingliz tili B1' },
      { date: '2026-04-19', status: 'present', group_name: 'Ingliz tili B1' },
    ];
  }
  if ((m = path.match(/\/students\/(\d+)\/groups$/))) {
    const sid = Number(m[1]);
    const s = findStudent(sid);
    return groups.filter((g) => s.group_names.includes(g.name));
  }
  if ((m = path.match(/\/students\/(\d+)\/payments$/))) {
    const sid = Number(m[1]);
    return payments.filter((p) => p.student_id === sid);
  }
  if ((m = path.match(/\/students\/(\d+)$/))) {
    const sid = Number(m[1]);
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...findStudent(sid), ...(req.data as object) };
    return findStudent(sid);
  }
  if (path.endsWith('/students')) {
    if (method === 'get') return paginated(students);
    if (method === 'post') return { ...(req.data as object), id: students.length + 1 };
  }

  // ---- Teachers ----
  if ((m = path.match(/\/teachers\/(\d+)\/groups$/))) {
    const tid = Number(m[1]);
    return groups.filter((g) => g.teacher_id === tid);
  }
  if ((m = path.match(/\/teachers\/(\d+)\/salaries$/))) {
    const tid = Number(m[1]);
    return salaries.filter((s) => s.teacher_id === tid);
  }
  if ((m = path.match(/\/teachers\/(\d+)$/))) {
    const tid = Number(m[1]);
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...findTeacher(tid), ...(req.data as object) };
    return findTeacher(tid);
  }
  if (path.endsWith('/teachers')) {
    if (method === 'get') return paginated(teachers);
    if (method === 'post') return { ...(req.data as object), id: teachers.length + 1 };
  }

  // ---- Groups ----
  if ((m = path.match(/\/groups\/(\d+)\/students\/(\d+)$/))) {
    if (method === 'delete') return { ok: true };
  }
  if ((m = path.match(/\/groups\/(\d+)\/students$/))) {
    const gid = Number(m[1]);
    const g = findGroup(gid);
    if (method === 'post') return { ok: true };
    return studentsInGroup(g.name);
  }
  if ((m = path.match(/\/groups\/(\d+)$/))) {
    const gid = Number(m[1]);
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...findGroup(gid), ...(req.data as object) };
    return findGroup(gid);
  }
  if (path.endsWith('/groups')) {
    if (method === 'get') return groups;
    if (method === 'post') return { ...(req.data as object), id: groups.length + 1 };
  }

  // ---- Courses ----
  if ((m = path.match(/\/courses\/(\d+)$/))) {
    const cid = Number(m[1]);
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...(courses.find((c) => c.id === cid) ?? courses[0]), ...(req.data as object) };
    return courses.find((c) => c.id === cid) ?? courses[0];
  }
  if (path.endsWith('/courses')) {
    if (method === 'get') return courses;
    if (method === 'post') return { ...(req.data as object), id: courses.length + 1 };
  }

  // ---- Rooms ----
  if ((m = path.match(/\/rooms\/(\d+)$/))) {
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...(req.data as object), id: Number(m[1]) };
  }
  if (path.endsWith('/rooms')) {
    if (method === 'get') return rooms;
    if (method === 'post') return { ...(req.data as object), id: rooms.length + 1 };
  }

  // ---- Payments ----
  if (path.endsWith('/payments')) {
    if (method === 'get') return paginated(payments);
    if (method === 'post') return { ...(req.data as object), id: payments.length + 1 };
  }

  // ---- Salaries ----
  if ((m = path.match(/\/salaries\/(\d+)$/))) {
    if (method === 'delete') return { ok: true };
  }
  if (path.endsWith('/salaries')) {
    if (method === 'get') return salaries;
    if (method === 'post') return { ...(req.data as object), id: salaries.length + 1 };
  }

  // ---- Student endpoints ----
  if (path.endsWith('/student/stats') || path.endsWith('/student/me')) {
    const me = students[0];
    const myGroups = groups.filter((g) => me.group_names.includes(g.name));
    const myPayments = payments.filter((p) => p.student_id === me.id);
    return {
      student_id: me.id,
      name: me.name,
      phone: me.phone,
      avatar: me.avatar,
      total_paid: me.paid,
      total_debt: me.debt,
      attendance_rate: 92,
      points: 320,
      rank: 4,
      groups: myGroups,
      next_lessons: [
        { id: 1, group_name: 'Ingliz tili B1', course: 'Ingliz tili', teacher: 'Aziz Karimov', room: '101', time: '17:00-18:30', date: '2026-04-27', day: 'Du' },
        { id: 2, group_name: 'Ingliz tili B1', course: 'Ingliz tili', teacher: 'Aziz Karimov', room: '101', time: '17:00-18:30', date: '2026-04-29', day: 'Ch' },
        { id: 3, group_name: 'Ingliz tili B1', course: 'Ingliz tili', teacher: 'Aziz Karimov', room: '101', time: '17:00-18:30', date: '2026-05-01', day: 'Ju' },
      ],
      recent_payments: myPayments.slice(0, 3),
      recent_attendance: [
        { date: '2026-04-25', status: 'present', group_name: 'Ingliz tili B1' },
        { date: '2026-04-23', status: 'present', group_name: 'Ingliz tili B1' },
        { date: '2026-04-21', status: 'absent', group_name: 'Ingliz tili B1' },
        { date: '2026-04-19', status: 'present', group_name: 'Ingliz tili B1' },
        { date: '2026-04-17', status: 'present', group_name: 'Ingliz tili B1' },
      ],
      achievements: [
        { id: 1, name: 'Birinchi haftalik 100%', icon: '🎯', earned: true },
        { id: 2, name: '10 ta ketma-ket dars', icon: '🔥', earned: true },
        { id: 3, name: 'Top 5 talaba', icon: '🏆', earned: false },
      ],
    };
  }

  // ---- Teacher endpoints ----
  if (path.endsWith('/teacher/stats')) return teacherStats;
  if (path.endsWith('/teacher/my-salaries')) return teacherSalaries;
  if ((m = path.match(/\/teacher\/my-groups\/(\d+)\/students$/))) {
    const gid = Number(m[1]);
    const g = findGroup(gid);
    return studentsInGroup(g.name).map((s) => ({
      id: s.id, name: s.name, phone: s.phone, avatar: s.avatar, status: s.status,
    }));
  }
  if (path.endsWith('/teacher/attendance/bulk')) return { ok: true };

  // ---- Attendance ----
  if (path.startsWith('/attendances') || path.endsWith('/attendances')) {
    if (path.endsWith('/attendances/bulk')) return { ok: true };
    return [];
  }

  // ---- Rewards / Gamification ----
  if ((m = path.match(/\/rewards\/(\d+)$/))) {
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...(req.data as object), id: Number(m[1]) };
  }
  if (path.endsWith('/rewards/wallets')) return rewardWallets;
  if (path.endsWith('/rewards/purchases')) return [];
  if (path.endsWith('/rewards')) {
    if (method === 'get') return rewards;
    if (method === 'post') return { ...(req.data as object), id: rewards.length + 1 };
  }

  // ---- Support bookings ----
  if ((m = path.match(/\/support-bookings\/(\d+)$/))) {
    if (method === 'put') return { ok: true };
  }
  if (path.endsWith('/support-bookings')) {
    if (method === 'get') return [];
    if (method === 'post') return { ...(req.data as object), id: 1 };
  }

  // ---- SMS ----
  if (path.endsWith('/sms/balance')) return { balance: 250000, currency: 'UZS' };
  if (path.endsWith('/sms/history')) return smsHistory;
  if ((m = path.match(/\/sms\/templates\/(\d+)$/))) {
    if (method === 'delete') return { ok: true };
    if (method === 'put') return { ...(req.data as object), id: Number(m[1]) };
  }
  if (path.endsWith('/sms/templates')) {
    if (method === 'get') return smsTemplates;
    if (method === 'post') return { ...(req.data as object), id: smsTemplates.length + 1 };
  }
  if (path.endsWith('/sms/send') || path.endsWith('/sms/bulk')) return { ok: true, sent: 1 };

  // ---- Settings ----
  if (path.endsWith('/settings/profile')) return profile;
  if (path.endsWith('/settings')) return settings;

  // Defaults
  if (method === 'get') return [];
  return { ok: true };
}
