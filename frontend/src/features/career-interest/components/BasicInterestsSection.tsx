"use client";

import { useState } from "react";
import { ChevronIcon } from "@/app/components/ChevronIcon";
import type { BasicScoreDTO, ResultDTO } from "@/features/career-interest/api";
import {
  BASIC_INTEREST_LABELS,
  type BasicInterestId,
  TYPE_BASIC_INTERESTS,
  TYPE_LABELS,
  type TypeId,
} from "@/features/career-interest/lib/types";
import { TypeBadge } from "./TypeBadge";
import { type BadgeColors, type ScoreColors, scoreColor } from "./theme";

export function BasicInterestsSection({
  types,
  basicScoreMap,
  colors,
  badge,
}: {
  types: ResultDTO["typeScores"];
  basicScoreMap: Map<string, BasicScoreDTO>;
  colors: ScoreColors;
  badge: BadgeColors;
}) {
  return (
    <section>
      <h2
        className="text-[13px] font-bold tracking-widest mb-1.5"
        style={{ color: badge.headingColor }}
      >
        基本興味領域スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div className="flex flex-col gap-3">
        {types.map((t) => {
          const tid = t.typeId as TypeId;
          const bids = TYPE_BASIC_INTERESTS[tid];
          const basicsWithScores = bids
            .map((bid) => ({ bid, score: basicScoreMap.get(bid) }))
            .filter((b): b is { bid: BasicInterestId; score: BasicScoreDTO } => b.score != null)
            .sort((a, b) => a.score.rank - b.score.rank);

          return (
            <div key={tid}>
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge typeId={tid} variant="filled" size="sm" badge={badge} />
                <span className="text-[14px] font-bold" style={{ color: badge.labelColor }}>
                  {TYPE_LABELS[tid]}
                </span>
              </div>

              <div className="flex flex-col">
                {basicsWithScores.map(({ bid, score }, i) => (
                  <BasicInterestRow
                    key={bid}
                    bid={bid}
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

function BasicInterestRow({
  bid,
  score,
  colors,
  badge,
  showDivider = false,
}: {
  bid: BasicInterestId;
  score: BasicScoreDTO;
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
    : score.rank >= 18
      ? { color: badge.rankBottomColor }
      : { color: badge.rankColor };
  const barColor = scoreColor(score.score, colors);
  const barPct = ((score.score - 1) / 4) * 100;

  return (
    <div>
      {showDivider && <div className="border-t border-gray-200 ml-3 mt-1" />}
      <div className="flex items-center gap-2 py-1 overflow-hidden">
        <span
          className="text-[13px] font-semibold w-10 text-right tabular-nums shrink-0 whitespace-nowrap"
          style={rankStyle}
        >
          {score.rank}位
        </span>

        <div className="flex items-center gap-0.5 min-w-0">
          <span
            className="text-[14px] truncate"
            style={{ color: badge.needLabelColor, fontWeight: badge.needLabelWeight }}
          >
            {BASIC_INTEREST_LABELS[bid]}
          </span>
          {medal && <span className="text-[13px] shrink-0">{medal}</span>}
        </div>

        <div className="flex-1 min-w-0" />

        <div className="w-[48px] shrink-0">
          <div className="h-[5px] rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${barPct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        <span
          className="text-[14px] font-bold tabular-nums w-10 text-right shrink-0"
          style={{ color: barColor }}
        >
          {score.score.toFixed(1)}
        </span>

        <button
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
