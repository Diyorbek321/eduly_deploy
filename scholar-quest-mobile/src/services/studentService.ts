import { api } from '../lib/api';
import type {
  LoginResponse,
  MaterialItem,
  MyAttendance,
  MyLearningPath,
  MyPayments,
  MyProfile,
  MySchedule,
  UserBrief,
} from '../lib/types';

export const authService = {
  login: (email: string, password: string) =>
    api.postForm<LoginResponse>('/auth/login', { username: email, password }),
  me: () => api.get<UserBrief>('/auth/me'),
  logout: (refresh_token: string) => api.post('/auth/logout', { refresh_token }),

  // Phone + SMS OTP login. Two-step:
  //   1) requestPhoneOtp(phone) — fire-and-forget; backend always returns
  //      generic 200 even for unregistered phones (no enumeration).
  //   2) verifyPhoneOtp(phone, code) — returns LoginResponse on success.
  requestPhoneOtp: (phone: string) =>
    api.post<{ message: string }>('/auth/phone/request', { phone }),
  verifyPhoneOtp: (phone: string, code: string) =>
    api.post<LoginResponse>('/auth/phone/verify', { phone, code }),

  // Forgot-password via SMS OTP — same two-step pattern.
  requestPasswordReset: (phone: string) =>
    api.post<{ message: string }>('/auth/password/reset/request', { phone }),
  confirmPasswordReset: (phone: string, code: string, new_password: string) =>
    api.post<{ message: string }>('/auth/password/reset/confirm', {
      phone,
      code,
      new_password,
    }),
};

export const studentService = {
  profile: () => api.get<MyProfile>('/students/me/'),
  schedule: (params?: { page?: number; limit?: number }) =>
    api.get<MySchedule>('/students/me/schedule', params),
  attendance: (params?: { page?: number; limit?: number; group_id?: number }) =>
    api.get<MyAttendance>('/students/me/attendance', params),
  payments: (params?: { page?: number; limit?: number }) =>
    api.get<MyPayments>('/students/me/payments', params),
  homework: () => api.get<MyHomework>('/homework/students/me'),
  learningPath: () => api.get<MyLearningPath>('/students/me/learning-path'),
  materials: (group_id?: number) =>
    api.get<MaterialItem[]>('/materials/my', group_id ? { group_id } : undefined),
};

export interface MyHomeworkItem {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  coin_reward: number;
  coins_awarded: number;
  status: 'pending' | 'done' | 'not_done';
  group_id: number;
  group_name: string;
  course_name: string | null;
  teacher_name: string;
  marked_at: string | null;
  created_at: string;
}

export interface MyHomework {
  items: MyHomeworkItem[];
  total: number;
  pending: number;
  done: number;
}

export interface RewardApi {
  id: number;
  name: string;
  cost: number;
  stock: number;
  image: string | null;
  is_active: boolean;
}

export interface WalletApi {
  student_id: number;
  student_name: string | null;
  coins: number;
}

export interface PurchaseApi {
  id: number;
  student_id: number;
  student_name: string | null;
  reward_id: number;
  reward_name: string | null;
  cost: number;
  status: string;
  created_at: string;
}

export const rewardService = {
  list: () => api.get<RewardApi[]>('/rewards/', { active_only: 'true' }),
  wallet: () => api.get<WalletApi>('/rewards/wallets/me'),
  purchases: () => api.get<PurchaseApi[]>('/rewards/purchases'),
  buy: (reward_id: number) =>
    api.post<PurchaseApi>('/rewards/purchases/me', { reward_id, student_id: 0 }),
};
