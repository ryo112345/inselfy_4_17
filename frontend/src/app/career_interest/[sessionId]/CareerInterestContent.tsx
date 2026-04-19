"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getResultBySessionId,
  type ResultDTO,
  type BasicScoreDTO,
} from "@/features/career-interest/api";
import {
  TYPE_LABELS,
  TYPE_DESCRIPTIONS,
  TYPE_PERSONALITIES,
  TYPE_ENGLISH_NAMES,
  TYPE_ABBREVIATIONS,
  TYPE_BASIC_INTERESTS,
  BASIC_INTEREST_LABELS,
  type TypeId,
  type BasicInterestId,
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

export function CareerInterestResultContent({ sessionId, initialData, isOwner = true }: { sessionId: string; initialData?: ResultDTO | null; isOwner?: boolean }) {
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

  const basicScoreMap = new Map(result.basic_scores.map((b) => [b.basic_interest_id, b]));
  const sortedTypes = [...result.type_scores].sort((a, b) => a.rank - b.rank);
  const riasecCode = sortedTypes.slice(0, 3).map((t) => t.type_id).join("");

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
      <RIASECCodeSection code={riasecCode} badge={badge} />
      <TypesSection types={sortedTypes} colors={colors} badge={badge} />
      <BasicInterestsSection types={sortedTypes} basicScoreMap={basicScoreMap} colors={colors} badge={badge} />

      <CIAiReportSection sessionId={sessionId} badge={badge} isOwner={isOwner} />
    </div>
  );
}


function RIASECCodeSection({ code, badge }: { code: string; badge: BadgeColors }) {
  return (
    <section className="mb-6 text-center">
      <h2 className="text-[13px] font-bold tracking-widest mb-2" style={{ color: badge.headingColor }}>
        RIASEC CODE
      </h2>
      <div className="flex justify-center gap-2">
        {code.split("").map((letter, i) => (
          <span
            key={i}
            className="w-12 h-12 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-md"
            style={{ backgroundColor: badge.text }}
          >
            {letter}
          </span>
        ))}
      </div>
      <p className="text-sm mt-2" style={{ color: badge.labelColor }}>
        {code.split("").map((l) => TYPE_LABELS[l as TypeId]).join(" / ")}
      </p>
    </section>
  );
}

function TypesSection({ types, colors, badge }: { types: ResultDTO["type_scores"]; colors: ScoreColors; badge: BadgeColors }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpenIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-bold tracking-widest mb-1.5" style={{ color: badge.headingColor }}>
        RIASEC タイプスコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div>
        {types.map((t) => {
          const tid = t.type_id as TypeId;
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

                <p className="text-[14px] font-medium leading-relaxed max-w-[280px] text-left" style={{ color: badge.descColor }}>
                  {TYPE_PERSONALITIES[tid]}
                </p>

                <span className="text-[22px] font-bold tabular-nums ml-1 w-16 text-right shrink-0" style={{ color: barColor }}>
                  {t.score.toFixed(1)}
                </span>

                <button
                  onClick={() => toggle(tid)}
                  className="text-gray-900 shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mt-1"
                >
                  <span className="transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
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
  types: ResultDTO["type_scores"];
  basicScoreMap: Map<string, BasicScoreDTO>;
  colors: ScoreColors;
  badge: BadgeColors;
}) {
  return (
    <section>
      <h2 className="text-[13px] font-bold tracking-widest mb-1.5" style={{ color: badge.headingColor }}>
        基本興味領域スコア
      </h2>
      <div className="border-t border-gray-200 mb-2" />

      <div className="flex flex-col gap-3">
        {types.map((t) => {
          const tid = t.type_id as TypeId;
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
                  <BasicInterestRow key={bid} bid={bid} score={score} colors={colors} badge={badge} showDivider={i > 0} />
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

function BasicInterestRow({ bid, score, colors, badge, showDivider = false }: { bid: BasicInterestId; score: BasicScoreDTO; colors: ScoreColors; badge: BadgeColors; showDivider?: boolean }) {
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
        <span className="text-[13px] font-semibold w-10 text-right tabular-nums shrink-0 whitespace-nowrap" style={rankStyle}>
          {score.rank}位
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[14px]" style={{ color: badge.needLabelColor, fontWeight: badge.needLabelWeight }}>
            {BASIC_INTEREST_LABELS[bid]}
          </span>
          {medal && <span className="text-[13px]">{medal}</span>}
        </div>

        <div className="flex-1 min-w-0" />

        <div className="w-[72px] shrink-0">
          <div className="h-[5px] rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${barPct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        <span className="text-[14px] font-bold tabular-nums w-10 text-right shrink-0" style={{ color: barColor }}>
          {score.score.toFixed(1)}
        </span>

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
        style={{ border: `1px solid ${badge.border}`, color: badge.text, backgroundColor: badge.bg }}
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

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { displayed, done, start, skip };
}

function CIAiReportSection({ sessionId, badge, isOwner = true }: { sessionId: string; badge: BadgeColors; isOwner?: boolean }) {
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
    fetch(`/api/career-interest/sessions/${sessionId}/ai-report`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.content) {
          setReportContent(data.content);
          setFirstView(!!data.first_view);
          if (!data.first_view) setShowReport(true);
        }
      })
      .finally(() => setInitialLoading(false));
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
      fetch(`/api/career-interest/sessions/${sessionId}/ai-report`)
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

  html = html.replace(/^<p>/, '<p class="catchphrase">');

  return html;
}

function ChevronIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
