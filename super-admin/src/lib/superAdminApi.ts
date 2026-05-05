/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios, { AxiosError, AxiosResponse } from "axios";
import { CenterAdmin, DashboardStats, EducationCenter } from "../types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { message: string; code: string } | null;
}

const TOKEN_KEY = "eduly_super_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const RAW_BASE = ((import.meta as any).env?.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: RAW_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Backend wraps every response in {success, data, error}. Unwrap on success;
// throw a clean Error on failure so callers can render `error.message`.
function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  const body = res.data;
  if (body && typeof body === "object" && "success" in body) {
    if (body.success) return body.data as T;
    throw new Error(body.error?.message || "Server xatosi");
  }
  return body as unknown as T;
}

function toError(err: unknown): Error {
  if (err instanceof AxiosError) {
    const env = err.response?.data as ApiEnvelope<unknown> | undefined;
    if (env?.error?.message) return new Error(env.error.message);
    if (err.response?.status === 401) return new Error("Avtorizatsiya talab qilinadi");
    if (err.response?.status === 403) return new Error("Ruxsat yo'q");
    return new Error(err.message);
  }
  return err instanceof Error ? err : new Error("Noma'lum xatolik");
}

async function request<T>(fn: () => Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  try {
    const res = await fn();
    return unwrap<T>(res);
  } catch (err) {
    throw toError(err);
  }
}

export type CreateCenterPayload = {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  subscription_plan: "Basic" | "Pro" | "Enterprise";
  status?: "Faol" | "Muzlatilgan" | "O'chirilgan";
};

export type UpdateCenterPayload = Partial<CreateCenterPayload>;

export type CreateAdminPayload = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
};

export type UpdateAdminPayload = {
  full_name?: string;
  phone?: string;
  status?: "Faol" | "Bloklangan";
};

export const superAdminApi = {
  // Centers
  getCenters: () =>
    request<EducationCenter[]>(() => api.get("/super-admin/centers")),

  createCenter: (data: CreateCenterPayload) =>
    request<EducationCenter>(() => api.post("/super-admin/centers", data)),

  getCenter: (id: string) =>
    request<EducationCenter>(() => api.get(`/super-admin/centers/${id}`)),

  updateCenter: (id: string, data: UpdateCenterPayload) =>
    request<EducationCenter>(() => api.patch(`/super-admin/centers/${id}`, data)),

  suspendCenter: (id: string) =>
    request<EducationCenter>(() => api.post(`/super-admin/centers/${id}/suspend`)),

  activateCenter: (id: string) =>
    request<EducationCenter>(() => api.post(`/super-admin/centers/${id}/activate`)),

  deleteCenter: (id: string) =>
    request<null>(() => api.delete(`/super-admin/centers/${id}`)),

  // Admins
  getCenterAdmins: (centerId: string) =>
    request<CenterAdmin[]>(() => api.get(`/super-admin/centers/${centerId}/admins`)),

  createCenterAdmin: (centerId: string, data: CreateAdminPayload) =>
    request<CenterAdmin>(() =>
      api.post(`/super-admin/centers/${centerId}/admins`, data)
    ),

  updateAdmin: (id: string, data: UpdateAdminPayload) =>
    request<CenterAdmin>(() => api.patch(`/super-admin/admins/${id}`, data)),

  deleteAdmin: (id: string) =>
    request<null>(() => api.delete(`/super-admin/admins/${id}`)),

  // Stats
  getStats: () =>
    request<DashboardStats>(() => api.get("/super-admin/stats")),
};
