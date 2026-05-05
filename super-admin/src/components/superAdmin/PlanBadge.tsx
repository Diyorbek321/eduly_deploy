/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from "../../lib/utils";

interface PlanBadgeProps {
  plan: "Basic" | "Pro" | "Enterprise";
  className?: string;
}

export default function PlanBadge({ plan, className }: PlanBadgeProps) {
  const styles = {
    Basic: "border-gray-200 text-gray-700 bg-gray-50",
    Pro: "border-blue-200 text-blue-700 bg-blue-50",
    Enterprise: "border-[#ec5b13]/20 text-[#ec5b13] bg-[#ec5b13]/5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        styles[plan],
        className
      )}
    >
      {plan}
    </span>
  );
}
