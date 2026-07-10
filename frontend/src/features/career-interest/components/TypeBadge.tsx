"use client";

import { TYPE_ABBREVIATIONS, type TypeId } from "@/features/career-interest/lib/types";
import type { BadgeColors } from "./theme";

export function TypeBadge({
  typeId,
  variant,
  size = "md",
  badge,
}: {
  typeId: TypeId;
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
        {TYPE_ABBREVIATIONS[typeId]}
      </span>
    );
  }

  return (
    <span
      className={`${dim} rounded-md flex items-center justify-center shrink-0 font-bold`}
      style={{ backgroundColor: badge.text, color: badge.bg }}
    >
      {TYPE_ABBREVIATIONS[typeId]}
    </span>
  );
}
