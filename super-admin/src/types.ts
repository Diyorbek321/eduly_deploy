/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  center_id?: string;
  avatar_url?: string;
}

export interface EducationCenter {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  status: "Faol" | "Muzlatilgan" | "O'chirilgan";
  subscription_plan: "Basic" | "Pro" | "Enterprise";
  admin_count: number;
  student_count: number;
  teacher_count: number;
  created_at: string; // ISO
}

export interface CenterAdmin {
  id: string;
  center_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: "Faol" | "Bloklangan";
  created_at: string;
}

export interface DashboardStats {
  total_centers: number;
  active_centers: number;
  total_students: number;
  total_teachers: number;
  total_revenue: number;
  mrr: number;
  growth_series: {
    month: string;
    centers: number;
    students: number;
  }[];
}
