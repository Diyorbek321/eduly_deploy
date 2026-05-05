export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface UserBrief {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  name: string | null;
  student_id: number | null;
  teacher_id: number | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserBrief;
}

export type StudentStatus = 'Faol' | 'Muzlatilgan' | 'Tark etgan' | string;
export type Gender = 'Erkak' | 'Ayol' | string;

export interface MyProfile {
  id: number;
  name: string;
  phone: string;
  gender: Gender;
  birth_date: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  avatar: string | null;
  status: StudentStatus;
  debt: number;
  paid: number;
  group_names: string[];
  created_at: string | null;
}

export interface ScheduleItem {
  group_id: number;
  group_name: string;
  course_name: string;
  teacher_name: string;
  schedule: string | null;
  time: string | null;
  room: string | null;
  status: string;
  enrolled_at: string;
}

export interface MySchedule {
  items: ScheduleItem[];
  total: number;
  page: number;
  pages: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | string;

export interface AttendanceItem {
  id: number;
  group_id: number;
  group_name: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface MyAttendance {
  items: AttendanceItem[];
  total: number;
  page: number;
  pages: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
}

export type PaymentMethod = 'Click' | 'Cash' | 'Payme' | 'Card' | string;
export type PaymentStatus = 'paid' | 'pending' | 'failed' | string;

export interface PaymentItem {
  id: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string | null;
  note: string | null;
}

export interface MyPayments {
  items: PaymentItem[];
  total: number;
  page: number;
  pages: number;
  total_paid: number;
  current_debt: number;
}
