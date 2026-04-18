"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getResultBySessionId,
  type ResultDTO,
  type NeedScoreDTO,
} from "@/features/work-values/api";
import {
  NEED_LABELS,
  NEED_DESCRIPTIONS,
  VALUE_LABELS,
  VALUE_DESCRIPTIONS,
  VALUE_ABBREVIATIONS,
  VALUE_ENGLISH_NAMES,
  VALUE_NEEDS,
  type NeedId,
  type ValueId,
} from "@/features/work-values/lib/needs";

const SCORE_COLORS = {
  tier1: "#149470",
  tier2: "#10b77f",
  tier3: "#8aa3d6",
  tier4: "#cfd0cd",
};

const DEFAULT_BADGE = {
  border: "#40b090",
  text: "#057f5d",
  bg: "#ebf9f3",
  labelColor: "#787878",
  headingColor: "#5e5a5a",
};

type BadgeColors = typeof DEFAULT_BADGE;

export default function WorkValuesResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<ResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = SCORE_COLORS;
  const [badge, setBadge] = useState(DEFAULT_BADGE);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getResultBySessionId(sessionId)
      .then(setResult)
      .catch(() => setError("診断結果が見つかりませんでした"));
  }, [sessionId]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4">
        <p className="text-gray-500">{error}</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const needScoreMap = new Map(result.needs.map((n) => [n.need_id, n]));
  const sortedValues = [...result.values].sort((a, b) => a.rank - b.rank);

  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 pt-6 pb-12">
      {showDebug && (
        <BadgeDebugPanel badge={badge} onChange={setBadge} onClose={() => setShowDebug(false)} />
      )}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-4 right-4 z-50 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow"
        >
          🎨 バッジ設定
        </button>
      )}
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
        <ValuesSection values={sortedValues} colors={colors} badge={badge} />
        <NeedsSection values={sortedValues} needScoreMap={needScoreMap} colors={colors} badge={badge} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  WORK VALUES スコア                                                  */
/* ------------------------------------------------------------------ */

type ScoreColors = typeof SCORE_COLORS;

function ValuesSection({ values, colors, badge }: { values: ResultDTO["values"]; colors: ScoreColors; badge: BadgeColors }) {
  const maxScore = Math.max(...values.map((v) => v.display_score));

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-bold tracking-widest mb-1.5" style={{ color: badge.headingColor }}>
        WORK VALUES スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div>
        {values.map((v, i) => {
          const vid = v.value_id as ValueId;
          const barPct = (v.display_score / maxScore) * 100;
          const barColor = scoreColor(v.display_score, colors);

          return (
            <div key={vid} className="py-1 first:pt-0">
              {/* top row */}
              <div className="flex items-center gap-2">
                <ValueBadge valueId={vid} variant="outline" badge={badge} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      {VALUE_LABELS[vid]}
                    </span>
                    <span className="text-[15px] font-bold" style={{ color: badge.labelColor }}>
                      ({VALUE_ENGLISH_NAMES[vid]})
                    </span>
                  </div>
                </div>

                <p className="text-[14px] font-medium text-gray-500 leading-relaxed max-w-[220px] text-left">
                  {VALUE_DESCRIPTIONS[vid]}
                </p>

                <span className="text-[22px] font-bold tabular-nums ml-1 w-14 text-right shrink-0" style={{ color: barColor }}>
                  {v.display_score.toFixed(1)}
                </span>

                <button className="text-gray-400 shrink-0 mt-1">
                  <ChevronIcon size={18} />
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

/* ------------------------------------------------------------------ */
/*  WORK NEEDS スコア                                                   */
/* ------------------------------------------------------------------ */

function NeedsSection({
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
      <h2 className="text-[13px] font-bold tracking-widest mb-1.5" style={{ color: badge.headingColor }}>
        WORK NEEDS スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div className="flex flex-col gap-6">
        {values.map((v) => {
          const vid = v.value_id as ValueId;
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
                <span className="text-[14px] font-bold text-gray-700">
                  {VALUE_LABELS[vid]}
                </span>
              </div>

              {/* needs list */}
              <div className="flex flex-col gap-0.5">
                {needsWithScores.map(({ nid, score }) => (
                  <NeedRow key={nid} needId={nid} score={score} colors={colors} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Need row                                                           */
/* ------------------------------------------------------------------ */

const MEDAL = ["🥇", "🥈", "🥉"] as const;

function NeedRow({ needId, score, colors }: { needId: NeedId; score: NeedScoreDTO; colors: ScoreColors }) {
  const medal = score.rank <= 3 ? MEDAL[score.rank - 1] : null;
  const isTop = score.rank <= 3;
  const rankColor = isTop ? "text-emerald-700" : "text-gray-400";
  const barColor = scoreColor(score.display_score, colors);

  return (
    <div className="flex items-center gap-2 py-2.5 px-1">
      {/* rank */}
      <span className={`text-[13px] font-semibold ${rankColor} w-7 text-right tabular-nums shrink-0`}>
        {score.rank}位
      </span>

      {/* label + medal */}
      <div className="flex items-center gap-0.5 w-[88px] shrink-0">
        <span className="text-[14px] font-bold text-gray-800 truncate">
          {NEED_LABELS[needId]}
        </span>
        {medal && <span className="text-[13px]">{medal}</span>}
      </div>

      {/* description */}
      <p className="flex-1 text-[12px] text-gray-500 leading-snug min-w-0">
        {NEED_DESCRIPTIONS[needId]}
      </p>

      {/* score bar */}
      <div className="w-[72px] shrink-0">
        <div className="h-[5px] rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${score.display_score}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* score */}
      <span className="text-[14px] font-bold tabular-nums w-10 text-right shrink-0" style={{ color: barColor }}>
        {score.display_score.toFixed(1)}
      </span>

      {/* chevron */}
      <button className="text-gray-400 shrink-0">
        <ChevronIcon size={16} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Value badge                                                        */
/* ------------------------------------------------------------------ */

function ValueBadge({
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
  const dim = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";

  if (variant === "outline") {
    return (
      <span
        className={`${dim} rounded-full font-semibold flex items-center justify-center shrink-0`}
        style={{ border: `1px solid ${badge.border}`, color: badge.text, backgroundColor: badge.bg }}
      >
        {VALUE_ABBREVIATIONS[valueId]}
      </span>
    );
  }

  return (
    <span
      className={`${dim} rounded-full font-bold flex items-center justify-center shrink-0`}
      style={{ backgroundColor: badge.text, color: badge.bg }}
    >
      {VALUE_ABBREVIATIONS[valueId]}
    </span>
  );
}

function scoreColor(score: number, colors: ScoreColors): string {
  if (score >= 90) return colors.tier1;
  if (score >= 55) return colors.tier2;
  if (score >= 30) return colors.tier3;
  return colors.tier4;
}


function BadgeDebugPanel({
  badge,
  onChange,
  onClose,
}: {
  badge: BadgeColors;
  onChange: (b: BadgeColors) => void;
  onClose: () => void;
}) {
  const fields = [
    { key: "border" as const, label: "枠線" },
    { key: "text" as const, label: "文字" },
    { key: "bg" as const, label: "背景" },
    { key: "labelColor" as const, label: "ラベル文字" },
    { key: "headingColor" as const, label: "見出し" },
  ];

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-700">🎨 バッジ色設定</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>
      {fields.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2 mb-2">
          <input
            type="color"
            value={badge[key]}
            onChange={(e) => onChange({ ...badge, [key]: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">{label}</div>
            <div className="text-[10px] text-gray-400 font-mono">{badge[key]}</div>
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span
          className="w-9 h-9 text-[13px] rounded-full font-semibold flex items-center justify-center"
          style={{ border: `1px solid ${badge.border}`, color: badge.text, backgroundColor: badge.bg }}
        >
          Id
        </span>
        <span
          className="w-7 h-7 text-[11px] rounded-full font-bold flex items-center justify-center"
          style={{ backgroundColor: badge.text, color: badge.bg }}
        >
          Id
        </span>
      </div>
    </div>
  );
}

function ChevronIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
