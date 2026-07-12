"use client";

import { useState } from "react";
import { ChevronIcon } from "@/app/components/ChevronIcon";
import type { NeedScoreDTO, ResultDTO } from "@/features/work-values/api";
import {
  type NeedId,
  VALUE_LABELS,
  VALUE_NEEDS,
  type ValueId,
} from "@/features/work-values/lib/needs";
import { type BadgeColors, type ScoreColors, scoreColor } from "./theme";
import { ValueBadge } from "./ValueBadge";

export function NeedsSection({
  values,
  needScoreMap,
  colors,
  badge,
}: {
  values: ResultDTO["values"];
  needScoreMap: Map<string, NeedScoreDTO>;
  colors: ScoreColors;
  badge: BadgeColors;
}) {
  return (
    <section>
      <h2
        className="text-[13px] font-bold tracking-widest mb-1.5"
        style={{ color: badge.headingColor }}
      >
        WORK NEEDS スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div className="flex flex-col gap-3">
        {values.map((v) => {
          const vid = v.valueId as ValueId;
          const needIds = VALUE_NEEDS[vid];
          const needsWithScores = needIds
            .map((nid) => ({ nid: nid as NeedId, score: needScoreMap.get(nid) }))
            .filter((n): n is { nid: NeedId; score: NeedScoreDTO } => n.score != null)
            .sort((a, b) => a.score.rank - b.score.rank);

          return (
            <div key={vid}>
              {/* group header */}
              <div className="flex items-center gap-2 mb-2">
                <ValueBadge valueId={vid} variant="filled" size="sm" badge={badge} />
                <span className="text-[14px] font-bold" style={{ color: badge.labelColor }}>
                  {VALUE_LABELS[vid]}
                </span>
              </div>

              {/* needs list */}
              <div className="flex flex-col">
                {needsWithScores.map(({ nid, score }, i) => (
                  <NeedRow
                    key={nid}
                    score={score}
                    colors={colors}
                    badge={badge}
                    showDivider={i > 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"] as const;

function NeedRow({
  score,
  colors,
  badge,
  showDivider = false,
}: {
  score: NeedScoreDTO;
  colors: ScoreColors;
  badge: BadgeColors;
  showDivider?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const medal = score.rank <= 3 ? MEDAL[score.rank - 1] : null;
  const isTop = score.rank <= 3;
  const RANK_COLORS = ["#FFB800", "#C0C0C0", "#C06A2B"] as const;
  const rankStyle = isTop
    ? { color: RANK_COLORS[score.rank - 1] }
    : score.rank >= 19
      ? { color: badge.rankBottomColor }
      : { color: badge.rankColor };
  const barColor = scoreColor(score.displayScore, colors);

  return (
    <div>
      {showDivider && <div className="border-t border-gray-200 ml-3 mt-1" />}
      <div className="flex items-center gap-2 py-1 overflow-hidden">
        {/* rank */}
        <span
          className="text-[13px] font-semibold w-10 text-right tabular-nums shrink-0 whitespace-nowrap"
          style={rankStyle}
        >
          {score.rank}位
        </span>

        {/* label + medal */}
        <div className="flex items-center gap-0.5 w-[88px] shrink-0">
          <span
            className="text-[14px] truncate"
            style={{ color: badge.needLabelColor, fontWeight: badge.needLabelWeight }}
          >
            {score.label}
          </span>
          {medal && <span className="text-[13px]">{medal}</span>}
        </div>

        <p
          className="hidden md:block flex-1 text-[13px] font-medium leading-snug min-w-0"
          style={{ color: badge.descColor }}
        >
          {score.descriptionJa}
        </p>
        <div className="flex-1 md:hidden" />

        {/* score bar */}
        <div className="w-[72px] shrink-0">
          <div className="h-[5px] rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${score.displayScore}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* score */}
        <span
          className="text-[14px] font-bold tabular-nums w-10 text-right shrink-0"
          style={{ color: barColor }}
        >
          {score.displayScore.toFixed(1)}
        </span>

        {/* chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
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
    </div>
  );
}
