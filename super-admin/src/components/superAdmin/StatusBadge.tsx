/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  status: "Faol" | "Muzlatilgan" | "O'chirilgan" | "Bloklangan";
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    Faol: "bg-emerald-50 text-emerald-700",
    Muzlatilgan: "bg-amber-50 text-amber-700",
    "O'chirilgan": "bg-rose-50 text-rose-700",
    Bloklangan: "bg-rose-100 text-rose-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        styles[status] || "bg-slate-100 text-slate-800",
        className
      )}
    >
      {status}
    </span>
  );
}
