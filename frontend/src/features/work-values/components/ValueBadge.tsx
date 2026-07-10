"use client";

import { VALUE_ABBREVIATIONS, type ValueId } from "@/features/work-values/lib/needs";
import type { BadgeColors } from "./theme";

export function ValueBadge({
  valueId,
  variant,
  size = "md",
  badge,
}: {
  valueId: ValueId;
  variant: "outline" | "filled";
  size?: "sm" | "md";
  badge: BadgeColors;
}) {
  const dim = size === "sm" ? "w-7 h-7 text-[14px]" : "w-9 h-9 text-[16px]";

  if (variant === "outline") {
    return (
      <span
        className={`${dim} rounded-full font-semibold flex items-center justify-center shrink-0`}
        style={{
          border: `1px solid ${badge.border}`,
          color: badge.text,
          backgroundColor: badge.bg,
        }}
      >
        {VALUE_ABBREVIATIONS[valueId]}
      </span>
    );
  }

  return (
    <span
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{
        backgroundColor: badge.text,
        color: badge.bg,
        fontSize: `${badge.badgeFontSize}px`,
        fontWeight: badge.badgeFontWeight,
        fontFamily: badge.badgeFontFamily,
      }}
    >
      {VALUE_ABBREVIATIONS[valueId]}
    </span>
  );
}
