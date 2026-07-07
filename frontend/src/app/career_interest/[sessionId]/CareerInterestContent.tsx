"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BasicScoreDTO,
  getAiReport,
  getResultBySessionId,
  type ResultDTO,
} from "@/features/career-interest/api";
import { getCIPersona } from "@/features/career-interest/lib/personas";
import {
  BASIC_INTEREST_LABELS,
  type BasicInterestId,
  TYPE_ABBREVIATIONS,
  TYPE_BASIC_INTERESTS,
  TYPE_DESCRIPTIONS,
  TYPE_ENGLISH_NAMES,
  TYPE_IDS,
  TYPE_LABELS,
  TYPE_PERSONALITIES,
  type TypeId,
} from "@/features/career-interest/lib/types";

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
  descColor: "#787878",
  needLabelColor: "#525a66",
  needLabelWeight: "500",
  rankColor: "#8c8e97",
  rankBottomColor: "#2d5395",
  headingColor: "#5e5a5a",
};

type BadgeColors = typeof DEFAULT_BADGE;
type ScoreColors = typeof SCORE_COLORS;

export function CareerInterestResultContent({
  sessionId,
  initialData,
  isOwner = true,
}: {
  sessionId: string;
  initialData?: ResultDTO | null;
  isOwner?: boolean;
}) {
  const [result, setResult] = useState<ResultDTO | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const colors = SCORE_COLORS;
  const badge = DEFAULT_BADGE;

  useEffect(() => {
    if (result || !sessionId) return;
    getResultBySessionId(sessionId)
      .then(setResult)
      .catch(() => setError("診断結果が見つかりませんでした"));
  }, [sessionId, result]);

  if (error) {
    return (
      <div className="flex min-h-[200px] items-center justify-center px-4">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const basicScoreMap = new Map(result.basicScores.map((b) => [b.basicInterestId, b]));
  const sortedTypes = [...result.typeScores].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
      <TopRIASECHeroSection types={sortedTypes} badge={badge} createdAt={result.createdAt} />
      <TypesSection types={sortedTypes} colors={colors} badge={badge} />
      <BasicInterestsSection
        types={sortedTypes}
        basicScoreMap={basicScoreMap}
        colors={colors}
        badge={badge}
      />

      <CIAiReportSection sessionId={sessionId} badge={badge} isOwner={isOwner} />
    </div>
  );
}

function TopRIASECHeroSection({
  types,
  badge,
  createdAt,
}: {
  types: ResultDTO["typeScores"];
  badge: BadgeColors;
  createdAt: string;
}) {
  const top3 = types.slice(0, 3);
  const persona = getCIPersona(types);

  return (
    <section
      className="mb-6 text-center px-6 pt-14 pb-6 relative overflow-hidden -mx-6 -mt-5 rounded-t-2xl"
      style={{ backgroundColor: "#F8F3FD" }}
    >
      <style>{`
        @keyframes ci-ripple-pulse {
          0% { width: 180px; height: 180px; opacity: 0.2; }
          50% { width: 280px; height: 280px; opacity: 0.08; }
          100% { width: 180px; height: 180px; opacity: 0.2; }
        }
        .ci-ripple-tr {
          position: absolute;
          top: 12%; right: 6%;
          border-radius: 50%;
          border: 1.5px solid #B08CD4;
          pointer-events: none;
          transform: translate(50%, -50%);
        }
        .ci-ripple-bl {
          position: absolute;
          bottom: 8%; left: 5%;
          border-radius: 50%;
          border: 1.5px solid #B08CD4;
          pointer-events: none;
          transform: translate(-50%, 50%);
        }
        .ci-badge-text {
          text-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        @keyframes ci-shimmer {
          0% { opacity: 0; transform: translate(-30%, -30%) scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(30%, 30%) scale(1.2); }
        }
        @keyframes ci-float-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes ci-float-2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ci-float-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        .ci-badge-glow {
          position: relative;
          overflow: hidden;
        }
        .ci-badge-float-1 { animation: ci-float-1 5s ease-in-out infinite; }
        .ci-badge-float-2 { animation: ci-float-2 5.6s ease-in-out 0.5s infinite; }
        .ci-badge-float-3 { animation: ci-float-3 4.6s ease-in-out 1s infinite; }
        .ci-badge-glow::after {
          content: '';
          position: absolute;
          width: 60%;
          height: 60%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
          animation: ci-shimmer 4s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div
        className="ci-ripple-tr"
        style={{ animation: "ci-ripple-pulse 8s ease-in-out infinite" }}
      />
      <div
        className="ci-ripple-bl"
        style={{ animation: "ci-ripple-pulse 8s ease-in-out infinite" }}
      />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-purple-50 transition-colors"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1={12} y1={2} x2={12} y2={15} />
          </svg>
          Share Link
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-purple-50 transition-colors"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={2} y={2} width={20} height={20} rx={5} />
            <circle cx={12} cy={12} r={4} />
            <circle cx={18} cy={6} r={1.5} fill="currentColor" stroke="none" />
          </svg>
          Share Story
        </button>
      </div>
      <div className="absolute top-4 left-4 z-10">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {(() => {
            const d = new Date(createdAt);
            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          })()}
        </span>
      </div>
      <h2
        className="relative text-[12px] font-bold tracking-[0.2em] mb-2 uppercase"
        style={{ color: "#9a8aaa" }}
      >
        Your RIASEC Type
      </h2>
      <p
        className="relative text-[26px] font-bold mb-1.5 bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #6B3FA0, #8B5CC8, #A87DE0, #C49CF0)",
        }}
      >
        {persona.modifier}
        {persona.name}
      </p>
      <p className="relative text-[14px] mb-5 tracking-wide" style={{ color: "#9a8aaa" }}>
        {persona.subtitle}
      </p>
      {/* Desktop: 3-column grid */}
      <div className="relative hidden md:grid grid-cols-3 items-center -mt-11">
        <div className="flex flex-col items-end gap-1 pr-4 justify-self-center translate-x-2">
          {top3.map((t) => (
            <span
              key={t.typeId}
              className="text-[16px] font-semibold leading-snug tracking-wide"
              style={{ color: "#5A2D82", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {TYPE_ENGLISH_NAMES[t.typeId as TypeId]}
            </span>
          ))}
        </div>
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((t, i) => {
            const tid = t.typeId as TypeId;
            const sizes = [
              { size: "80px", text: "text-3xl", radius: "rounded-2xl" },
              { size: "64px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "52px", text: "text-xl", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            const badgeStyles = [
              {
                background:
                  "linear-gradient(170deg, #C49CF0 0%, #A87DE0 30%, #8B5CC8 60%, #7B4BAF 100%)",
                boxShadow:
                  "0 6px 14px rgba(120,70,200,0.35), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
              {
                background:
                  "linear-gradient(170deg, #B890E8 0%, #9C70DC 30%, #8858C8 60%, #7A50B8 100%)",
                boxShadow:
                  "0 6px 14px rgba(110,70,190,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
              {
                background:
                  "linear-gradient(170deg, #B088DC 0%, #9668C8 30%, #8058B8 60%, #7450A8 100%)",
                boxShadow:
                  "0 6px 14px rgba(100,70,170,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
            ];
            return (
              <span
                key={tid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center ci-badge-text ci-badge-glow ci-badge-float-${i + 1} shrink-0`}
                style={{ ...badgeStyles[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {TYPE_ABBREVIATIONS[tid]}
              </span>
            );
          })}
        </div>
        <div className="flex justify-start pl-4">
          <RIASECRadarChart types={types} />
        </div>
      </div>
      {/* Mobile: stacked layout */}
      <div className="relative flex flex-col items-center gap-4 md:hidden">
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((t, i) => {
            const tid = t.typeId as TypeId;
            const sizes = [
              { size: "72px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "58px", text: "text-xl", radius: "rounded-2xl" },
              { size: "48px", text: "text-lg", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            const badgeStyles = [
              {
                background:
                  "linear-gradient(170deg, #C49CF0 0%, #A87DE0 30%, #8B5CC8 60%, #7B4BAF 100%)",
                boxShadow:
                  "0 6px 14px rgba(120,70,200,0.35), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
              {
                background:
                  "linear-gradient(170deg, #B890E8 0%, #9C70DC 30%, #8858C8 60%, #7A50B8 100%)",
                boxShadow:
                  "0 6px 14px rgba(110,70,190,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
              {
                background:
                  "linear-gradient(170deg, #B088DC 0%, #9668C8 30%, #8058B8 60%, #7450A8 100%)",
                boxShadow:
                  "0 6px 14px rgba(100,70,170,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
              },
            ];
            return (
              <span
                key={tid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center ci-badge-text ci-badge-glow ci-badge-float-${i + 1} shrink-0`}
                style={{ ...badgeStyles[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {TYPE_ABBREVIATIONS[tid]}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
          {top3.map((t) => (
            <span
              key={t.typeId}
              className="text-[14px] font-semibold leading-snug tracking-wide"
              style={{ color: "#5A2D82", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {TYPE_ENGLISH_NAMES[t.typeId as TypeId]}
            </span>
          ))}
        </div>
        <RIASECRadarChart types={types} />
      </div>
    </section>
  );
}

const RADAR_ORDER: TypeId[] = ["R", "I", "A", "S", "E", "C"];

function RIASECRadarChart({ types }: { types: ResultDTO["typeScores"] }) {
  const cx = 95;
  const cy = 95;
  const R = 60;
  const scoreMap = new Map(types.map((t) => [t.typeId, t]));

  const hexPoint = (i: number, r: number) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / 6;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = RADAR_ORDER.map((_, i) => hexPoint(i, R * level));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  });

  const dataPoints = RADAR_ORDER.map((tid, i) => {
    const t = scoreMap.get(tid);
    const score = t ? (t.score - 1) / 4 : 0;
    return hexPoint(i, R * Math.max(score, 0.05));
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const spokes = RADAR_ORDER.map((_, i) => hexPoint(i, R));

  return (
    <svg width={190} height={190} className="shrink-0">
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#d0c0e0" strokeWidth={0.6} />
      ))}
      {spokes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d0c0e0" strokeWidth={0.6} />
      ))}
      <path d={dataPath} fill="rgba(139,92,200,0.15)" stroke="#8B5CC8" strokeWidth={1.2} />
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#8B5CC8" />
      ))}
      {RADAR_ORDER.map((tid, i) => {
        const pt = hexPoint(i, R + 20);
        return (
          <g key={tid}>
            <circle cx={pt.x} cy={pt.y} r={14} fill="#f0e8fa" stroke="#A87DE0" strokeWidth={1} />
            <text
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#6B3FA0"
              fontSize={13}
              fontWeight="600"
            >
              {TYPE_ABBREVIATIONS[tid]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TypesSection({
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

function BasicInterestsSection({
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

function TypeBadge({
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

function scoreColor(score: number, colors: ScoreColors): string {
  if (score >= 4.0) return colors.tier1;
  if (score >= 3.0) return colors.tier2;
  if (score >= 2.0) return colors.tier3;
  return colors.tier4;
}

function useTypewriter(fullText: string | null, charsPerTick = 2, intervalMs = 30) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const start = useCallback(() => {
    if (!fullText) return;
    indexRef.current = 0;
    setDisplayed("");
    setDone(false);

    timerRef.current = setInterval(() => {
      indexRef.current += charsPerTick;
      if (indexRef.current >= fullText.length) {
        indexRef.current = fullText.length;
        if (timerRef.current) clearInterval(timerRef.current);
        setDone(true);
      }
      setDisplayed(fullText.slice(0, indexRef.current));
    }, intervalMs);
  }, [fullText, charsPerTick, intervalMs]);

  const skip = useCallback(() => {
    if (!fullText) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(fullText);
    setDone(true);
  }, [fullText]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return { displayed, done, start, skip };
}

function CIAiReportSection({
  sessionId,
  badge,
  isOwner = true,
}: {
  sessionId: string;
  badge: BadgeColors;
  isOwner?: boolean;
}) {
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [firstView, setFirstView] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [scrollSpacer, setScrollSpacer] = useState(false);
  const { displayed, done, start } = useTypewriter(reportContent);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAiReport(sessionId)
      .then((data) => {
        if (cancelled) return;
        if (data?.content) {
          setReportContent(data.content);
          setFirstView(!!data.firstView);
          if (!data.firstView) setShowReport(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleClick = () => {
    if (reportContent) {
      setScrollSpacer(true);
      setShowReport(true);
      if (firstView) {
        requestAnimationFrame(() => {
          if (sectionRef.current) {
            sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            let timer: ReturnType<typeof setTimeout>;
            const onScroll = () => {
              clearTimeout(timer);
              timer = setTimeout(() => {
                window.removeEventListener("scroll", onScroll);
                start();
              }, 80);
            };
            window.addEventListener("scroll", onScroll);
            onScroll();
          } else {
            start();
          }
        });
      }
    } else {
      setLoading(true);
      getAiReport(sessionId)
        .then((data) => {
          if (data?.content) {
            setReportContent(data.content);
            setFirstView(!!data.firstView);
            setShowReport(true);
          } else {
            setNotFound(true);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  const reportProseClasses =
    "prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-purple-800 [&_h2]:border-l-3 [&_h2]:border-purple-500 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-purple-700 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-purple-400 [&_.catchphrase]:bg-purple-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-purple-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4";

  return (
    <div ref={sectionRef} className="relative mt-10 scroll-mt-4">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <span
          className="text-[13px] font-semibold text-white rounded-full px-5 py-1.5 tracking-wide"
          style={{
            background: "linear-gradient(180deg, #9B6BC8 0%, #7B4BAF 50%, #6B3FA0 100%)",
            boxShadow:
              "0 4px 10px rgba(107,63,160,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
          }}
        >
          inselfy.ai
        </span>
      </div>
      <div className="rounded-md border border-gray-200 bg-[#fdfbff] px-8 pt-8 pb-7">
        <h3 className="text-[14px] font-bold mb-1.5" style={{ color: badge.headingColor }}>
          AI キャリアレポート
        </h3>
        <div className="border-t border-gray-200 mb-3" />

        {initialLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[14px]">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            読み込み中
          </div>
        ) : showReport && reportContent && firstView ? (
          <div
            className={reportProseClasses}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 自前パイプラインで生成したAIレポートMarkdownのHTML化（ユーザー入力ではない）
            dangerouslySetInnerHTML={{ __html: markdownToHtml(displayed) }}
          />
        ) : showReport && reportContent ? (
          <div
            className={reportProseClasses}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 自前パイプラインで生成したAIレポートMarkdownのHTML化（ユーザー入力ではない）
            dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
          />
        ) : isOwner ? (
          <>
            <p className="text-[16px] text-gray-500 leading-relaxed mb-5">
              AIがあなたの診断結果を分析し、適した職業やキャリアアドバイスをレポートとして生成します。
            </p>
            <button
              onClick={handleClick}
              disabled={loading}
              className="bg-purple-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(107,63,160,0.45)] hover:bg-purple-800 hover:shadow-[0_6px_16px_-4px_rgba(107,63,160,0.55)] transition cursor-pointer disabled:opacity-50"
            >
              レポートを作成する
            </button>
            {notFound && (
              <p className="text-[13px] text-amber-600 mt-4">
                レポートはまだ作成中です。しばらくお待ちください。
              </p>
            )}
          </>
        ) : (
          <p className="text-[16px] text-gray-500 leading-relaxed">
            レポートはまだ作成されていません。
          </p>
        )}
      </div>
      {scrollSpacer && !done && <div className="h-screen" />}
    </div>
  );
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^[・-] (.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<p>(<h[23]>)/g, "$1")
    .replace(/(<\/h[23]>)<\/p>/g, "$1")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1")
    .replace(/<p>(<blockquote>)/g, "$1")
    .replace(/(<\/blockquote>)<\/p>/g, "$1");

  html = html.replace(/^<p>/, '<p class="catchphrase">');

  return html;
}

function ChevronIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
