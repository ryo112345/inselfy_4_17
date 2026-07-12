"use client";

import { useState } from "react";
import { ChevronIcon } from "@/app/components/ChevronIcon";
import type { ResultDTO } from "@/features/work-values/api";
import {
  VALUE_DESCRIPTIONS,
  VALUE_ENGLISH_NAMES,
  VALUE_LABELS,
  type ValueId,
} from "@/features/work-values/lib/needs";
import { type BadgeColors, type ScoreColors, scoreColor } from "./theme";
import { ValueBadge } from "./ValueBadge";

export function ValuesSection({
  values,
  colors,
  badge,
}: {
  values: ResultDTO["values"];
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
        WORK VALUES スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div>
        {values.map((v) => {
          const vid = v.valueId as ValueId;
          const barPct = v.displayScore;
          const barColor = scoreColor(v.displayScore, colors);
          const isOpen = openIds.has(vid);

          return (
            <div key={vid} className="py-1 first:pt-0">
              {/* top row */}
              <div className="flex items-center gap-2">
                <ValueBadge valueId={vid} variant="outline" badge={badge} />

                <div className="flex-1 min-w-0 overflow-visible">
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap w-max">
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      {VALUE_LABELS[vid]}
                    </span>
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      ({VALUE_ENGLISH_NAMES[vid]})
                    </span>
                  </div>
                </div>

                <p
                  className="hidden md:block text-[14px] font-medium leading-relaxed max-w-[220px] text-left"
                  style={{ color: badge.descColor }}
                >
                  {VALUE_DESCRIPTIONS[vid]}
                </p>

                <span
                  className="pl-2 text-[22px] font-bold tabular-nums ml-1 w-16 text-right shrink-0"
                  style={{ color: barColor }}
                >
                  {v.displayScore.toFixed(1)}
                </span>

                <button
                  type="button"
                  onClick={() => toggle(vid)}
                  className="relative z-10 bg-white text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
                >
                  <span
                    className="transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <ChevronIcon size={14} />
                  </span>
                </button>
              </div>

              {/* score bar */}
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
