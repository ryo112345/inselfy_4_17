"use client";

import { useEffect, useState } from "react";
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

export function WorkValuesResultContent({ sessionId, initialData }: { sessionId: string; initialData?: ResultDTO | null }) {
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
      <ValuesSection values={sortedValues} colors={colors} badge={badge} />
      <NeedsSection values={sortedValues} needScoreMap={needScoreMap} colors={colors} badge={badge} />

      <AiReportSection sessionId={sessionId} badge={badge} />
    </div>
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

                <p className="text-[14px] font-medium leading-relaxed max-w-[220px] text-left" style={{ color: badge.descColor }}>
                  {VALUE_DESCRIPTIONS[vid]}
                </p>

                <span className="text-[22px] font-bold tabular-nums ml-1 w-16 text-right shrink-0" style={{ color: barColor }}>
                  {v.display_score.toFixed(1)}
                </span>

                <button
                  onClick={() => toggle(vid)}
                  className="text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
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

      {/* description */}
      <p className="flex-1 text-[13px] font-medium leading-snug min-w-0" style={{ color: badge.descColor }}>
        {score.description_ja}
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

function AiReportSection({ sessionId, badge }: { sessionId: string; badge: BadgeColors }) {
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleClick = async () => {
    if (showReport && reportContent) {
      setShowReport(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/work-values/sessions/${sessionId}/ai-report`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setReportContent(data.content);
      setShowReport(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mt-10">
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

        {showReport && reportContent ? (
          <div className="prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-emerald-800 [&_h2]:border-l-3 [&_h2]:border-emerald-600 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-emerald-700 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-emerald-400 [&_.catchphrase]:bg-emerald-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-emerald-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
          />
        ) : (
          <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
            AIがあなたの診断結果を分析し、適した職業やキャリアアドバイスをレポートとして生成します。
          </p>
        )}

        {notFound && (
          <p className="text-[13px] text-amber-600 mb-4">
            レポートはまだ作成中です。しばらくお待ちください。
          </p>
        )}

        <button
          onClick={handleClick}
          disabled={loading}
          className="bg-emerald-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(5,95,70,0.45)] hover:bg-emerald-800 hover:shadow-[0_6px_16px_-4px_rgba(5,95,70,0.55)] transition cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              読み込み中
            </span>
          ) : showReport ? (
            "レポートを閉じる"
          ) : (
            "レポートを見る"
          )}
        </button>
      </div>
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
