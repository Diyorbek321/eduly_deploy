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
  homework_strikes: number;
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

export interface MaterialItem {
  id: number;
  group_id: number;
  group_name: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: 'pdf' | 'video' | 'image' | 'doc' | 'other';
  file_size: number | null;
  created_at: string | null;
}

export interface LearningPathItem {
  group_id: number;
  group_name: string;
  course_name: string;
  teacher_name: string;
  enrolled_at: string;
  max_duration_months: number | null;
  target_completion_date: string | null;
  days_elapsed: number;
  days_total: number | null;
  days_remaining: number | null;
  time_progress_pct: number;
  homework_done: number;
  homework_total: number;
  homework_pct: number;
  is_behind: boolean;
}

export interface MyLearningPath {
  items: LearningPathItem[];
  total: number;
}
