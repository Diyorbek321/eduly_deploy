import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'none';

export function getPaymentStatus(debt: number, paid: number): PaymentStatus {
  if (debt > 0 && paid > 0) return 'partial';
  if (debt > 0) return 'unpaid';
  if (paid > 0) return 'paid';
  return 'none';
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  paid:    { label: "To'langan",   className: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Qisman",      className: "bg-amber-100 text-amber-700" },
  unpaid:  { label: "Qarzdor",     className: "bg-rose-100 text-rose-700" },
  none:    { label: "—",           className: "bg-slate-100 text-slate-500" },
};
