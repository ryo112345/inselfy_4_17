"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getResultBySessionId,
  type ResultDTO,
  type NeedScoreDTO,
} from "@/features/work-values/api";
import {
  VALUE_LABELS,
  VALUE_DESCRIPTIONS,
  VALUE_ABBREVIATIONS,
  VALUE_ENGLISH_NAMES,
  VALUE_NEEDS,
  type NeedId,
  type ValueId,
} from "@/features/work-values/lib/needs";
import { getWVPersona } from "@/features/work-values/lib/personas";

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
  badgeFontSize: "14",
  badgeFontWeight: "600",
  badgeFontFamily: "system-ui",
  headingColor: "#5e5a5a",
};

type BadgeColors = typeof DEFAULT_BADGE;

const BADGE_STYLES = [
  {
    background: "linear-gradient(170deg, #98e0f0 0%, #6ad0e0 30%, #4ac0d4 60%, #58c0b8 100%)",
    boxShadow: "0 6px 14px rgba(70,180,200,0.35), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #90dcd6 0%, #64d0c4 30%, #48c0b4 60%, #50bca8 100%)",
    boxShadow: "0 6px 14px rgba(70,180,170,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #94dcc4 0%, #6cd0ac 30%, #54c498 60%, #4cbc90 100%)",
    boxShadow: "0 6px 14px rgba(90,180,140,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
];

export function WorkValuesResultContent({ sessionId, initialData, isOwner = true }: { sessionId: string; initialData?: ResultDTO | null; isOwner?: boolean }) {
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

  const needScoreMap = new Map(result.needs.map((n) => [n.need_id, n]));
  const sortedValues = [...result.values].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
      <TopValuesCodeSection values={sortedValues} badge={badge} createdAt={result.created_at} />
      <ValuesSection values={sortedValues} colors={colors} badge={badge} />
      <NeedsSection values={sortedValues} needScoreMap={needScoreMap} colors={colors} badge={badge} />

      <AiReportSection sessionId={sessionId} badge={badge} isOwner={isOwner} />
    </div>
  );
}


function TopValuesCodeSection({ values, badge, createdAt }: { values: ResultDTO["values"]; badge: BadgeColors; createdAt: string }) {
  const top3 = values.slice(0, 3);
  const persona = getWVPersona(values);

  return (
    <section
      className="mb-6 text-center px-6 pt-14 pb-6 relative overflow-hidden -mx-6 -mt-5 rounded-t-2xl"
      style={{ backgroundColor: "#F5FBF8" }}
    >
      <style>{`
        @keyframes wv-ripple-pulse {
          0% { width: 180px; height: 180px; opacity: 0.2; }
          50% { width: 280px; height: 280px; opacity: 0.08; }
          100% { width: 180px; height: 180px; opacity: 0.2; }
        }
        .wv-ripple-tr {
          position: absolute;
          top: 12%; right: 6%;
          border-radius: 50%;
          border: 1.5px solid #7DC4A0;
          pointer-events: none;
          transform: translate(50%, -50%);
        }
        .wv-ripple-bl {
          position: absolute;
          bottom: 8%; left: 5%;
          border-radius: 50%;
          border: 1.5px solid #7DC4A0;
          pointer-events: none;
          transform: translate(-50%, 50%);
        }
        .wv-badge-text {
          text-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        @keyframes wv-shimmer {
          0% { opacity: 0; transform: translate(-30%, -30%) scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(30%, 30%) scale(1.2); }
        }
        @keyframes wv-float-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes wv-float-2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes wv-float-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        .wv-badge-glow {
          position: relative;
          overflow: hidden;
        }
        .wv-badge-float-1 { animation: wv-float-1 5s ease-in-out infinite; }
        .wv-badge-float-2 { animation: wv-float-2 5.6s ease-in-out 0.5s infinite; }
        .wv-badge-float-3 { animation: wv-float-3 4.6s ease-in-out 1s infinite; }
        .wv-badge-glow::after {
          content: '';
          position: absolute;
          width: 60%;
          height: 60%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
          animation: wv-shimmer 4s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="wv-ripple-tr" style={{ animation: "wv-ripple-pulse 8s ease-in-out infinite" }} />
      <div className="wv-ripple-bl" style={{ animation: "wv-ripple-pulse 8s ease-in-out infinite" }} />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-emerald-50 transition-colors" style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1={12} y1={2} x2={12} y2={15} />
          </svg>
          Share Link
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-emerald-50 transition-colors" style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={2} y={2} width={20} height={20} rx={5} />
            <circle cx={12} cy={12} r={4} />
            <circle cx={18} cy={6} r={1.5} fill="currentColor" stroke="none" />
          </svg>
          Share Story
        </button>
      </div>
      <div className="absolute top-4 left-4 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border" style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {(() => {
            const d = new Date(createdAt);
            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          })()}
        </span>
      </div>
      <h2 className="relative text-[12px] font-bold tracking-[0.2em] mb-2 uppercase" style={{ color: "#8a9e94" }}>
        Your Work Values
      </h2>
      <p
        className="relative text-[26px] font-bold mb-1.5 bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #0E7B4E, #1B9E6A, #4ECFA0, #7EDDBB)",
        }}
      >
        {persona.modifier}{persona.name}
      </p>
      <p className="relative text-[14px] mb-5 tracking-wide" style={{ color: "#8a9e94" }}>
        {persona.subtitle}
      </p>
      {/* Desktop: 3-column grid */}
      <div className="relative hidden md:grid grid-cols-3 items-center -mt-11">
        <div className="flex flex-col items-end gap-1 pr-4 justify-self-center translate-x-2">
          {top3.map((v) => (
            <span key={v.value_id} className="text-[16px] font-semibold leading-snug tracking-wide" style={{ color: "#1B6B4A", fontFamily: "system-ui, -apple-system, sans-serif" }}>
              {VALUE_ENGLISH_NAMES[v.value_id as ValueId]}
            </span>
          ))}
        </div>
        <div className="flex items-end justify-center gap-2.5">
            {top3.map((v, i) => {
              const vid = v.value_id as ValueId;
              const sizes = [
                { size: "80px", text: "text-3xl", radius: "rounded-2xl" },
                { size: "64px", text: "text-2xl", radius: "rounded-2xl" },
                { size: "52px", text: "text-xl", radius: "rounded-xl" },
              ];
              const s = sizes[i];
              return (
                <span
                  key={vid}
                  className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center wv-badge-text wv-badge-glow wv-badge-float-${i + 1} shrink-0`}
                  style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
                >
                  {VALUE_ABBREVIATIONS[vid]}
                </span>
              );
            })}
          </div>
        <div className="flex justify-start pl-4">
          <ValuesRadarChart values={values} badge={badge} />
        </div>
      </div>
      {/* Mobile: stacked layout */}
      <div className="relative flex flex-col items-center gap-4 md:hidden">
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((v, i) => {
            const vid = v.value_id as ValueId;
            const sizes = [
              { size: "72px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "58px", text: "text-xl", radius: "rounded-2xl" },
              { size: "48px", text: "text-lg", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            return (
              <span
                key={vid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center wv-badge-text wv-badge-glow wv-badge-float-${i + 1} shrink-0`}
                style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {VALUE_ABBREVIATIONS[vid]}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
          {top3.map((v) => (
            <span key={v.value_id} className="text-[14px] font-semibold leading-snug tracking-wide" style={{ color: "#1B6B4A", fontFamily: "system-ui, -apple-system, sans-serif" }}>
              {VALUE_ENGLISH_NAMES[v.value_id as ValueId]}
            </span>
          ))}
        </div>
        <ValuesRadarChart values={values} badge={badge} />
      </div>
    </section>
  );
}

const RADAR_ORDER: ValueId[] = ["achievement", "status", "autonomy", "safety", "altruism", "comfort"];

function ValuesRadarChart({ values, badge }: { values: ResultDTO["values"]; badge: BadgeColors }) {
  const cx = 95;
  const cy = 95;
  const R = 60;
  const scoreMap = new Map(values.map((v) => [v.value_id, v]));
  const top3Set = new Set(
    [...values].sort((a, b) => a.rank - b.rank).slice(0, 3).map((v) => v.value_id)
  );

  const hexPoint = (i: number, r: number) => {
    const angle = (Math.PI / 2) + (2 * Math.PI * i) / 6;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = RADAR_ORDER.map((_, i) => hexPoint(i, R * level));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  });

  const dataPoints = RADAR_ORDER.map((vid, i) => {
    const v = scoreMap.get(vid);
    const score = v ? v.display_score / 100 : 0;
    return hexPoint(i, R * Math.max(score, 0.05));
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const spokes = RADAR_ORDER.map((_, i) => hexPoint(i, R));

  return (
    <svg width={190} height={190} className="shrink-0">
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#d0ddd6" strokeWidth={0.6} />
      ))}
      {spokes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d0ddd6" strokeWidth={0.6} />
      ))}
      <path d={dataPath} fill="rgba(61,139,110,0.15)" stroke="#5a9e82" strokeWidth={1.2} />
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#4a9474" />
      ))}
      {RADAR_ORDER.map((vid, i) => {
        const pt = hexPoint(i, R + 20);
        return (
          <g key={vid}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={14}
              fill="#ebf9f3"
              stroke="#40b090"
              strokeWidth={1}
            />
            <text
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#057f5d"
              fontSize={13}
              fontWeight="600"
            >
              {VALUE_ABBREVIATIONS[vid]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  WORK VALUES スコア                                                  */
/* ------------------------------------------------------------------ */

type ScoreColors = typeof SCORE_COLORS;

function ValuesSection({ values, colors, badge }: { values: ResultDTO["values"]; colors: ScoreColors; badge: BadgeColors }) {
  const maxScore = Math.max(...values.map((v) => v.display_score));
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpenIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-bold tracking-widest mb-1.5" style={{ color: badge.headingColor }}>
        WORK VALUES スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div>
        {values.map((v, i) => {
          const vid = v.value_id as ValueId;
          const barPct = v.display_score;
          const barColor = scoreColor(v.display_score, colors);
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

                <p className="hidden md:block text-[14px] font-medium leading-relaxed max-w-[220px] text-left" style={{ color: badge.descColor }}>
                  {VALUE_DESCRIPTIONS[vid]}
                </p>

                <span className="pl-2 text-[22px] font-bold tabular-nums ml-1 w-16 text-right shrink-0" style={{ color: barColor }}>
                  {v.display_score.toFixed(1)}
                </span>

                <button
                  onClick={() => toggle(vid)}
                  className="relative z-10 bg-white text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
                >
                  <span className="transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
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

      <div className="flex flex-col gap-3">
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
                <span className="text-[14px] font-bold" style={{ color: badge.labelColor }}>
                  {VALUE_LABELS[vid]}
                </span>
              </div>

              {/* needs list */}
              <div className="flex flex-col">
                {needsWithScores.map(({ nid, score }, i) => (
                  <NeedRow key={nid} score={score} colors={colors} badge={badge} showDivider={i > 0} />
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

function NeedRow({ score, colors, badge, showDivider = false }: { score: NeedScoreDTO; colors: ScoreColors; badge: BadgeColors; showDivider?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const medal = score.rank <= 3 ? MEDAL[score.rank - 1] : null;
  const isTop = score.rank <= 3;
  const RANK_COLORS = ["#FFB800", "#C0C0C0", "#C06A2B"] as const;
  const rankStyle = isTop
    ? { color: RANK_COLORS[score.rank - 1] }
    : score.rank >= 19
      ? { color: badge.rankBottomColor }
      : { color: badge.rankColor };
  const barColor = scoreColor(score.display_score, colors);

  return (
    <div>
      {showDivider && <div className="border-t border-gray-200 ml-3 mt-1" />}
      <div className="flex items-center gap-2 py-1 overflow-hidden">
      {/* rank */}
      <span className="text-[13px] font-semibold w-10 text-right tabular-nums shrink-0 whitespace-nowrap" style={rankStyle}>
        {score.rank}位
      </span>

      {/* label + medal */}
      <div className="flex items-center gap-0.5 w-[88px] shrink-0">
        <span className="text-[14px] truncate" style={{ color: badge.needLabelColor, fontWeight: badge.needLabelWeight }}>
          {score.label}
        </span>
        {medal && <span className="text-[13px]">{medal}</span>}
      </div>

      <p className="hidden md:block flex-1 text-[13px] font-medium leading-snug min-w-0" style={{ color: badge.descColor }}>
        {score.description_ja}
      </p>
      <div className="flex-1 md:hidden" />

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
      >
        <span className="transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronIcon size={14} />
        </span>
      </button>
      </div>
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
  const dim = size === "sm" ? "w-7 h-7 text-[14px]" : "w-9 h-9 text-[16px]";

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
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{ backgroundColor: badge.text, color: badge.bg, fontSize: `${badge.badgeFontSize}px`, fontWeight: badge.badgeFontWeight, fontFamily: badge.badgeFontFamily }}
    >
      {VALUE_ABBREVIATIONS[valueId]}
    </span>
  );
}

function scoreColor(score: number, colors: ScoreColors): string {
  if (score >= 80) return colors.tier1;
  if (score >= 55) return colors.tier2;
  if (score >= 30) return colors.tier3;
  return colors.tier4;
}

function ChevronIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Report Section                                                   */
/* ------------------------------------------------------------------ */

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

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { displayed, done, start, skip };
}

function AiReportSection({ sessionId, badge, isOwner = true }: { sessionId: string; badge: BadgeColors; isOwner?: boolean }) {
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
    fetch(`/api/work-values/sessions/${sessionId}/ai-report`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.content) {
          setReportContent(data.content);
          setFirstView(!!data.first_view);
          if (!data.first_view) setShowReport(true);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInitialLoading(false); });
    return () => { cancelled = true; };
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
      fetch(`/api/work-values/sessions/${sessionId}/ai-report`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.content) {
            setReportContent(data.content);
            setFirstView(!!data.first_view);
            setShowReport(true);
          } else {
            setNotFound(true);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  const reportProseClasses = "prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-emerald-800 [&_h2]:border-l-3 [&_h2]:border-emerald-600 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-emerald-700 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-emerald-400 [&_.catchphrase]:bg-emerald-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-emerald-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4";

  return (
    <div ref={sectionRef} className="relative mt-10 scroll-mt-4">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <span
          className="text-[13px] font-semibold text-white rounded-full px-5 py-1.5 tracking-wide"
          style={{
            background: "linear-gradient(180deg, #4a8c6f 0%, #2d6b4e 50%, #1f5c3f 100%)",
            boxShadow: "0 4px 10px rgba(30,80,55,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
          }}
        >
          inselfy.ai
        </span>
      </div>
      <div className="rounded-md border border-gray-200 bg-[#fbfdfb] px-8 pt-8 pb-7">
        <h3 className="text-[14px] font-bold mb-1.5" style={{ color: badge.headingColor }}>AI キャリアレポート</h3>
        <div className="border-t border-gray-200 mb-3" />

        {initialLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[14px]">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            読み込み中
          </div>
        ) : showReport && reportContent && firstView ? (
          <div
            className={reportProseClasses}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(displayed) }}
          />
        ) : showReport && reportContent ? (
          <div
            className={reportProseClasses}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
          />
        ) : (
          isOwner ? (
            <>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-5">
                AIがあなたの診断結果を分析し、適した職業やキャリアアドバイスをレポートとして生成します。
              </p>
              <button
                onClick={handleClick}
                disabled={loading}
                className="bg-emerald-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(5,95,70,0.45)] hover:bg-emerald-800 hover:shadow-[0_6px_16px_-4px_rgba(5,95,70,0.55)] transition cursor-pointer disabled:opacity-50"
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
          )
        )}
      </div>
      {scrollSpacer && !done && <div className="h-screen" />}
    </div>
  );
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^[・-] (.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p>(<h[23]>)/g, '$1')
    .replace(/(<\/h[23]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1');

  // 最初の<p>をキャッチコピーとしてスタイル付与（最初の見出しより前の段落）
  html = html.replace(/^<p>/, '<p class="catchphrase">');

  return html;
}
