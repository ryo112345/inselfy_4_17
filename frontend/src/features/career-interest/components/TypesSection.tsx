"use client";

import { useState } from "react";
import { ChevronIcon } from "@/app/components/ChevronIcon";
import type { ResultDTO } from "@/features/career-interest/api";
import {
  TYPE_ENGLISH_NAMES,
  TYPE_LABELS,
  TYPE_PERSONALITIES,
  type TypeId,
} from "@/features/career-interest/lib/types";
import { TypeBadge } from "./TypeBadge";
import { type BadgeColors, type ScoreColors, scoreColor } from "./theme";

export function TypesSection({
  types,
  colors,
  badge,
}: {
  types: ResultDTO["typeScores"];
  colors: ScoreColors;
  badge: BadgeColors;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <section className="mb-6">
      <h2
        className="text-[13px] font-bold tracking-widest mb-1.5"
        style={{ color: badge.headingColor }}
      >
        RIASEC タイプスコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div>
        {types.map((t) => {
          const tid = t.typeId as TypeId;
          const barPct = ((t.score - 1) / 4) * 100;
          const barColor = scoreColor(t.score, colors);
          const isOpen = openIds.has(tid);

          return (
            <div key={tid} className="py-1 first:pt-0">
              <div className="flex items-center gap-2">
                <TypeBadge typeId={tid} variant="outline" badge={badge} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      {TYPE_LABELS[tid]}
                    </span>
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      ({TYPE_ENGLISH_NAMES[tid]})
                    </span>
                  </div>
                </div>

                <p
                  className="hidden md:block text-[14px] font-medium leading-relaxed max-w-[280px] text-left"
                  style={{ color: badge.descColor }}
                >
                  {TYPE_PERSONALITIES[tid]}
                </p>

                <span
                  className="text-[22px] font-bold tabular-nums ml-1 w-16 text-right shrink-0"
                  style={{ color: barColor }}
                >
                  {t.score.toFixed(1)}
                </span>

                <button
                  onClick={() => toggle(tid)}
                  className="text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
                >
                  <span
                    className="transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <ChevronIcon size={14} />
                  </span>
                </button>
              </div>

              <div className="mt-2 h-[10px] rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
