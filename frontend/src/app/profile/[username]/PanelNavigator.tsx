"use client";

import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CareerInterestResultContent } from "@/app/career_interest/[sessionId]/CareerInterestContent";
import { IntegratedReportContent } from "@/app/integrated-report/[requestId]/IntegratedReportContent";
import { WorkValuesResultContent } from "@/app/work_values/[sessionId]/WorkValuesContent";
import type { ModelsSimilarUserItem } from "@/external/client/api/orval/generated/models";
import { useAuth } from "@/features/auth/auth-context";
import type { ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import type { ResultDTO as WvResultDTO } from "@/features/work-values/api";
import { SimilarUsersCard } from "./SimilarUsersCard";

type Props = {
  children: ReactNode;
  userId?: string;
  // サーバーで取得した類似ユーザー（null はフェッチ失敗）。userId とセットで渡す
  similarUsers?: ModelsSimilarUserItem[] | null;
  username: string;
  displayName?: string;
  wvSessionId: string | null;
  ciSessionId: string | null;
  wvResult?: WvResultDTO | null;
  ciResult?: CiResultDTO | null;
  wvHasReport?: boolean;
  ciHasReport?: boolean;
  intReportRequestId?: string | null;
  intReportHasReport?: boolean;
  // サーバーで解決した閲覧者判定。「省略＝オーナー扱い」の事故を防ぐため必須（F22）
  isOwner: boolean;
  initialPanel?: number;
};

export function PanelNavigator({
  children,
  userId,
  similarUsers = null,
  username,
  displayName = username,
  wvSessionId,
  ciSessionId,
  wvResult,
  ciResult,
  wvHasReport,
  ciHasReport,
  intReportRequestId,
  intReportHasReport,
  isOwner: serverIsOwner,
  initialPanel = 0,
}: Props) {
  const { user } = useAuth();
  const isOwner = serverIsOwner || user?.username === username;
  const showWvResult = !!wvSessionId && (isOwner || !!wvHasReport);
  const showCiResult = !!ciSessionId && (isOwner || !!ciHasReport);
  const showIntReport = !!intReportRequestId && (isOwner || !!intReportHasReport);

  const urls = useMemo(
    () => [
      `/profile/${username}`,
      showIntReport ? `/integrated-report/${intReportRequestId}` : `/profile/${username}`,
      showWvResult ? `/work_values/${wvSessionId}` : `/profile/${username}`,
      showCiResult ? `/career_interest/${ciSessionId}` : `/profile/${username}`,
    ],
    [
      username,
      wvSessionId,
      ciSessionId,
      intReportRequestId,
      showWvResult,
      showCiResult,
      showIntReport,
    ],
  );
  const panelCount = 4;

  const [activeIndex, setActiveIndex] = useState(initialPanel);
  const [expanded, setExpanded] = useState(false);

  const urlToIndex = useCallback(
    (path: string) => {
      for (let i = urls.length - 1; i >= 0; i--) {
        if (urls[i] === path) return i;
      }
      return 0;
    },
    [urls],
  );

  useEffect(() => {
    const restored = window.history.state?.panelIndex;
    if (restored != null && restored !== initialPanel) {
      setActiveIndex(restored);
    } else {
      window.history.replaceState(
        { ...window.history.state, panelIndex: initialPanel },
        "",
        urls[initialPanel],
      );
    }
  }, [initialPanel, urls]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const idx = e.state?.panelIndex ?? urlToIndex(window.location.pathname);
      setActiveIndex(idx);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [urlToIndex]);

  const desktopPanelPx = 672;
  const gapPx = 12;

  const [isMobile, setIsMobile] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [transitionReady, setTransitionReady] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    setHydrated(true);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setTransitionReady(true));
  }, []);

  const showSimilar = !!wvSessionId && !!userId;
  const canGoSimilar = isMobile && showSimilar;
  const displayOffset = canGoSimilar ? 1 : 0;
  const minIndex = canGoSimilar ? -1 : 0;

  const goTo = useCallback(
    (index: number) => {
      if (index < minIndex || index >= panelCount) return;
      setActiveIndex(index);
      window.history.pushState(
        { ...window.history.state, panelIndex: index },
        "",
        urls[Math.max(0, index)],
      );
    },
    [minIndex, urls],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number; swiping: boolean | null } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, swiping: null };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (touchRef.current.swiping === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchRef.current.swiping = Math.abs(dx) > Math.abs(dy);
        if (touchRef.current.swiping) setDragging(true);
      }
      return;
    }
    if (!touchRef.current.swiping) return;
    setDragX(dx);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = touchRef.current;
      touchRef.current = null;
      setDragX(0);
      setDragging(false);
      if (!touch?.swiping) return;
      const dx = e.changedTouches[0].clientX - touch.x;
      const vw = window.innerWidth;
      if (dx < -vw * 0.2) goTo(activeIndex + 1);
      else if (dx > vw * 0.2) goTo(activeIndex - 1);
    },
    [activeIndex, goTo],
  );

  const focusedTransform = isMobile
    ? `calc(${-(activeIndex + displayOffset)} * 100vw + ${dragX}px)`
    : `calc(50% - ${desktopPanelPx / 2}px - ${activeIndex * (desktopPanelPx + gapPx)}px)`;
  const expandedTransform = isMobile
    ? `calc(${-(activeIndex + displayOffset)} * 100vw + ${dragX}px)`
    : `-${(activeIndex + displayOffset) * (desktopPanelPx + gapPx)}px`;

  return (
    <div
      className="relative px-0 md:px-4 overflow-hidden h-[calc(100dvh-1rem)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {showSimilar && (
        <div
          className="absolute top-0 h-full overflow-y-auto z-10 transition-opacity duration-300 hidden xl:block scrollbar-hide pl-3"
          style={{
            width: `calc(50% - ${desktopPanelPx / 2}px - ${gapPx}px)`,
            left: 0,
            opacity: activeIndex === 0 && !expanded ? 1 : 0,
            pointerEvents: activeIndex === 0 && !expanded ? "auto" : "none",
          }}
        >
          <SimilarUsersCard users={similarUsers} visible={activeIndex === 0} />
        </div>
      )}

      <div
        ref={trackRef}
        className={`flex items-stretch h-full${transitionReady && !dragging ? " transition-all duration-300 ease-in-out" : ""}`}
        style={
          hydrated
            ? {
                gap: isMobile ? undefined : `${gapPx}px`,
                transform: `translateX(${expanded ? expandedTransform : focusedTransform})`,
              }
            : undefined
        }
      >
        {canGoSimilar && (
          <div className="shrink-0 overflow-y-auto overscroll-contain scrollbar-hide w-screen px-4 pt-4 pb-24 md:pb-0">
            <SimilarUsersCard users={similarUsers} visible={true} className="w-full" />
          </div>
        )}

        <div className="shrink-0 overflow-y-auto overscroll-contain scrollbar-hide w-screen md:w-[672px] pb-24 md:pb-0">
          {children}
        </div>

        <div className="shrink-0 overflow-y-auto overscroll-contain scrollbar-hide w-screen md:w-[672px] pb-24 md:pb-0">
          {showIntReport && intReportRequestId ? (
            <IntegratedReportContent
              requestId={intReportRequestId}
              isOwner={isOwner}
              wvResult={wvResult ?? null}
              ciResult={ciResult ?? null}
            />
          ) : (
            <IntegratedReportPlaceholder isOwner={isOwner} displayName={displayName} />
          )}
        </div>

        <div className="shrink-0 overflow-y-auto overscroll-contain scrollbar-hide w-screen md:w-[672px] pb-24 md:pb-0">
          {showWvResult && wvSessionId ? (
            <WorkValuesResultContent
              sessionId={wvSessionId}
              initialData={wvResult}
              isOwner={isOwner}
            />
          ) : (
            <WorkValuesPlaceholder isOwner={isOwner} displayName={displayName} />
          )}
        </div>

        <div className="shrink-0 overflow-y-auto overscroll-contain scrollbar-hide w-screen md:w-[672px] pb-24 md:pb-0">
          {showCiResult && ciSessionId ? (
            <CareerInterestResultContent
              sessionId={ciSessionId}
              initialData={ciResult}
              isOwner={isOwner}
            />
          ) : (
            <CareerInterestPlaceholder isOwner={isOwner} displayName={displayName} />
          )}
        </div>
      </div>

      <div className="fixed bottom-[76px] left-0 right-0 z-40 flex justify-center items-center gap-1.5 md:hidden">
        {Array.from({ length: panelCount - minIndex }, (_, i) => i + minIndex).map((idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => goTo(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeIndex ? "w-5 bg-gray-700" : "w-1.5 bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-1">
        <button
          type="button"
          data-testid="panel-prev"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === minIndex}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 cursor-pointer"
        >
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {expanded ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
        </button>
        <button
          type="button"
          data-testid="panel-next"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === panelCount - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function WorkValuesPlaceholder({
  isOwner,
  displayName = "",
}: {
  isOwner: boolean;
  displayName?: string;
}) {
  return (
    <div className="relative mx-auto max-w-2xl text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 pt-14 pb-0 overflow-hidden shadow-sm flex flex-col min-h-[520px]">
      <WvFloatingSpheres />

      <div className="relative z-10 mb-6 flex-1">
        <span className="inline-block rounded-full border border-emerald-400/40 px-5 py-1.5 text-[13px] font-semibold tracking-[0.15em] text-emerald-400 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle" />
          SELF-ASSESSMENT SYSTEM
        </span>

        <h2
          className="text-[42px] font-bold text-white leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Work Values
        </h2>
        <p className="text-[16px] text-gray-300 tracking-[0.3em] mb-6">価 値 観 診 断</p>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          21の仕事価値観を一対比較で測定し、
          <br />
          あなたの内なるコンパスを可視化します。
        </p>
        <div className="flex justify-center gap-8 mt-8">
          <div>
            <span className="text-[32px] font-bold text-white">70</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">
              PAIRS
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-white">21</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">
              NEEDS
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-white">10</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">
              MIN
            </span>
          </div>
        </div>
        {!isOwner && (
          <p className="text-[14px] text-gray-500 mt-6">
            {displayName} さんはまだ診断を受けていません
          </p>
        )}
      </div>

      <div className="relative z-10 -mx-10 mt-10 border-t border-gray-700 bg-gradient-to-t from-black/90 to-[#0a1628] px-10 py-8">
        {isOwner ? (
          <Link
            href="/work_values/start"
            className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base py-4 transition-colors text-center"
          >
            診断を開始する &rarr;
          </Link>
        ) : (
          <button
            type="button"
            className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base py-4 transition-colors text-center cursor-pointer"
          >
            受診を依頼する
          </button>
        )}
      </div>
    </div>
  );
}

function CareerInterestPlaceholder({
  isOwner,
  displayName = "",
}: {
  isOwner: boolean;
  displayName?: string;
}) {
  return (
    <div className="relative mx-auto max-w-2xl text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-sm flex flex-col min-h-[520px]">
      <CiFloatingShapes />

      <div className="relative z-10 mb-6 flex-1">
        <span className="inline-block rounded-full border border-blue-400/40 px-5 py-1.5 text-[13px] font-semibold tracking-[0.15em] text-blue-500 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />
          SELF-ASSESSMENT SYSTEM
        </span>

        <h2
          className="text-[42px] font-bold text-gray-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Career Interest
        </h2>
        <p className="text-[16px] text-gray-600 tracking-[0.3em] mb-6">職 業 興 味 診 断</p>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          各活動への興味度を5段階で評価してください。
          <br />
          直感で答えて大丈夫です。
        </p>
        <div className="flex justify-center gap-8 mt-8">
          <div>
            <span className="text-[32px] font-bold text-gray-800">60</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">
              QUESTIONS
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">20</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">
              TYPES
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">10</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">
              MIN
            </span>
          </div>
        </div>
        {!isOwner && (
          <p className="text-[14px] text-gray-500 mt-6">
            {displayName} さんはまだ診断を受けていません
          </p>
        )}
      </div>

      <div className="relative z-10 -mx-10 mt-10 border-t border-gray-200 bg-white px-10 py-8">
        {isOwner ? (
          <Link
            href="/career_interest/start"
            className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors text-center"
          >
            診断を開始する &rarr;
          </Link>
        ) : (
          <button
            type="button"
            className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors text-center cursor-pointer"
          >
            受診を依頼する
          </button>
        )}
      </div>
    </div>
  );
}

function IntegratedReportPlaceholder({
  isOwner,
  displayName = "",
}: {
  isOwner: boolean;
  displayName?: string;
}) {
  return (
    <div className="relative mx-auto max-w-2xl text-center rounded-3xl bg-[#fdf6e3] border border-amber-200/60 px-10 pt-14 pb-0 overflow-hidden shadow-sm flex flex-col min-h-[520px]">
      <IntFloatingParticles />

      <div className="relative z-10 mb-6 flex-1">
        <span className="inline-block rounded-full border border-amber-400/40 px-5 py-1.5 text-[13px] font-semibold tracking-[0.15em] text-amber-700 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2 align-middle" />
          INTEGRATED ANALYSIS
        </span>

        <h2
          className="text-[42px] font-bold text-gray-800 leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Career Report
        </h2>
        <p className="text-[16px] text-gray-600 tracking-[0.3em] mb-6">
          統 合 キ ャ リ ア レ ポ ー ト
        </p>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          診断結果と経歴をAIが統合分析し、
          <br />
          あなただけのキャリアレポートを作成します。
        </p>
        <div className="flex justify-center gap-8 mt-8">
          <div>
            <span className="text-[32px] font-bold text-gray-800">2</span>
            <span className="text-[13px] font-semibold text-amber-600 tracking-wider ml-1.5">
              DIAGNOSTICS
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">10</span>
            <span className="text-[13px] font-semibold text-amber-600 tracking-wider ml-1.5">
              THEMES
            </span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">4</span>
            <span className="text-[13px] font-semibold text-amber-600 tracking-wider ml-1.5">
              CHAPTERS
            </span>
          </div>
        </div>
        {!isOwner && (
          <p className="text-[14px] text-gray-500 mt-6">
            {displayName} さんはまだレポートを作成していません
          </p>
        )}
      </div>

      <div className="relative z-10 -mx-10 mt-10 border-t border-amber-200/60 bg-white px-10 py-12">
        {isOwner ? (
          <p className="text-[14px] text-gray-500">
            プロフィールの「AI Report」カードからレポートを生成できます
          </p>
        ) : (
          <p className="text-[14px] text-gray-500">レポートはまだ作成されていません</p>
        )}
      </div>
    </div>
  );
}

const INT_PARTICLES: IntParticle[] = [
  {
    type: "sphere",
    size: 140,
    top: "-5%",
    left: "-8%",
    color: "rgba(217,170,100,0.25)",
    dur: "20s",
    dx: 55,
    dy: 40,
  },
  {
    type: "sphere",
    size: 120,
    top: "50%",
    left: "65%",
    color: "rgba(200,150,80,0.22)",
    dur: "24s",
    dx: -50,
    dy: -45,
  },
  {
    type: "sphere",
    size: 110,
    top: "30%",
    left: "12%",
    color: "rgba(220,180,100,0.22)",
    dur: "18s",
    dx: -40,
    dy: -50,
  },
  {
    type: "sphere",
    size: 100,
    top: "-3%",
    left: "70%",
    color: "rgba(200,160,90,0.24)",
    dur: "16s",
    dx: -55,
    dy: 45,
  },
  {
    type: "sphere",
    size: 85,
    top: "60%",
    left: "25%",
    color: "rgba(230,190,110,0.20)",
    dur: "22s",
    dx: 50,
    dy: -30,
  },
  {
    type: "hex",
    size: 120,
    top: "70%",
    left: "-3%",
    color: "rgba(190,160,100,0.18)",
    dur: "22s",
    dx: 60,
    dy: -35,
    rotate: 15,
  },
  {
    type: "rect",
    size: 100,
    top: "40%",
    left: "78%",
    color: "rgba(200,170,110,0.16)",
    dur: "20s",
    dx: -45,
    dy: 35,
    rotate: 20,
  },
  {
    type: "hex",
    size: 90,
    top: "15%",
    left: "40%",
    color: "rgba(210,175,105,0.17)",
    dur: "18s",
    dx: -35,
    dy: 50,
    rotate: -10,
  },
  {
    type: "rect",
    size: 80,
    top: "75%",
    left: "45%",
    color: "rgba(195,155,90,0.16)",
    dur: "16s",
    dx: 40,
    dy: -40,
    rotate: 30,
  },
];

type IntParticle = {
  type: "sphere" | "hex" | "rect";
  size: number;
  top: string;
  left: string;
  color: string;
  dur: string;
  dx: number;
  dy: number;
  rotate?: number;
};

function IntFloatingParticles() {
  return (
    <>
      <style>{`
        @keyframes int-particle-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {INT_PARTICLES.map((s) =>
          s.type === "sphere" ? (
            <div
              key={`${s.top}-${s.left}-${s.size}`}
              className="absolute rounded-full blur-[3px]"
              style={
                {
                  width: s.size,
                  height: s.size,
                  top: s.top,
                  left: s.left,
                  background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, ${s.color} 40%, rgba(120,80,20,0.15) 100%)`,
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                  animation: `int-particle-float ${s.dur} ease-in-out infinite`,
                } as React.CSSProperties
              }
            />
          ) : (
            <div
              key={`${s.top}-${s.left}-${s.size}`}
              className="absolute blur-[3px]"
              style={
                {
                  width: s.size,
                  height: s.size,
                  top: s.top,
                  left: s.left,
                  transform: `rotate(${s.rotate ?? 0}deg)`,
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                  animation: `int-particle-float ${s.dur} ease-in-out infinite`,
                } as React.CSSProperties
              }
            >
              {s.type === "hex" ? (
                <svg aria-hidden="true" viewBox="0 0 100 100" className="w-full h-full">
                  <polygon
                    points="50,2 93,25 93,75 50,98 7,75 7,25"
                    fill={s.color}
                    stroke={s.color.replace(/[\d.]+\)$/, "0.25)")}
                    strokeWidth="1"
                  />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 100 100" className="w-full h-full">
                  <rect
                    x="5"
                    y="5"
                    width="90"
                    height="90"
                    rx="12"
                    fill={s.color}
                    stroke={s.color.replace(/[\d.]+\)$/, "0.25)")}
                    strokeWidth="1"
                  />
                </svg>
              )}
            </div>
          ),
        )}
      </div>
    </>
  );
}

const WV_SPHERES = [
  {
    size: 180,
    top: "-8%",
    left: "-6%",
    color: "rgba(90,120,240,0.25)",
    dur: "28s",
    dx: 70,
    dy: 55,
  },
  {
    size: 160,
    top: "55%",
    left: "68%",
    color: "rgba(220,80,120,0.22)",
    dur: "32s",
    dx: -60,
    dy: -50,
  },
  {
    size: 150,
    top: "72%",
    left: "-5%",
    color: "rgba(180,80,240,0.22)",
    dur: "36s",
    dx: 65,
    dy: -45,
  },
  {
    size: 170,
    top: "35%",
    left: "10%",
    color: "rgba(140,100,230,0.22)",
    dur: "30s",
    dx: -50,
    dy: -60,
  },
  {
    size: 110,
    top: "-5%",
    left: "72%",
    color: "rgba(240,170,60,0.24)",
    dur: "24s",
    dx: -65,
    dy: 55,
  },
  {
    size: 100,
    top: "38%",
    left: "-8%",
    color: "rgba(50,200,180,0.24)",
    dur: "26s",
    dx: 75,
    dy: -40,
  },
  {
    size: 105,
    top: "80%",
    left: "55%",
    color: "rgba(60,140,240,0.22)",
    dur: "28s",
    dx: -55,
    dy: -50,
  },
  {
    size: 95,
    top: "12%",
    left: "38%",
    color: "rgba(80,220,140,0.24)",
    dur: "22s",
    dx: -45,
    dy: 65,
  },
  {
    size: 90,
    top: "25%",
    left: "82%",
    color: "rgba(240,200,60,0.24)",
    dur: "24s",
    dx: -60,
    dy: 40,
  },
  {
    size: 85,
    top: "30%",
    left: "58%",
    color: "rgba(230,80,180,0.22)",
    dur: "26s",
    dx: 50,
    dy: -55,
  },
  {
    size: 80,
    top: "78%",
    left: "30%",
    color: "rgba(160,230,80,0.24)",
    dur: "22s",
    dx: 55,
    dy: -45,
  },
  { size: 75, top: "5%", left: "18%", color: "rgba(200,60,220,0.25)", dur: "20s", dx: -40, dy: 60 },
  { size: 70, top: "60%", left: "42%", color: "rgba(60,200,230,0.24)", dur: "24s", dx: 50, dy: 40 },
];

function WvFloatingSpheres() {
  return (
    <>
      <style>{`
        @keyframes wv-sphere-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {WV_SPHERES.map((s) => (
          <div
            key={`${s.top}-${s.left}-${s.size}`}
            className="absolute rounded-full blur-[2px]"
            style={
              {
                width: s.size,
                height: s.size,
                top: s.top,
                left: s.left,
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, ${s.color} 40%, rgba(0,0,0,0.3) 100%)`,
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
                animation: `wv-sphere-float ${s.dur} ease-in-out infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

const CI_SHAPES = [
  {
    type: "hex",
    size: 160,
    top: "-8%",
    left: "-10%",
    color: "rgba(180,220,210,0.35)",
    dur: "14s",
    dx: 60,
    dy: 45,
    rotate: 15,
  },
  {
    type: "rect",
    size: 150,
    top: "55%",
    left: "65%",
    color: "rgba(200,180,220,0.35)",
    dur: "16s",
    dx: -55,
    dy: -50,
    rotate: 20,
  },
  {
    type: "hex",
    size: 140,
    top: "35%",
    left: "8%",
    color: "rgba(240,210,180,0.30)",
    dur: "15s",
    dx: -45,
    dy: -55,
    rotate: 25,
  },
  {
    type: "rect",
    size: 110,
    top: "-5%",
    left: "70%",
    color: "rgba(180,200,230,0.30)",
    dur: "12s",
    dx: -60,
    dy: 50,
    rotate: -15,
  },
  {
    type: "hex",
    size: 100,
    top: "70%",
    left: "-5%",
    color: "rgba(170,210,200,0.30)",
    dur: "13s",
    dx: 65,
    dy: -40,
    rotate: -20,
  },
  {
    type: "rect",
    size: 105,
    top: "78%",
    left: "50%",
    color: "rgba(190,220,210,0.28)",
    dur: "14s",
    dx: -50,
    dy: -45,
    rotate: 30,
  },
  {
    type: "hex",
    size: 90,
    top: "10%",
    left: "35%",
    color: "rgba(160,210,200,0.35)",
    dur: "11s",
    dx: -40,
    dy: 60,
    rotate: -10,
  },
  {
    type: "rect",
    size: 85,
    top: "25%",
    left: "80%",
    color: "rgba(180,195,230,0.30)",
    dur: "12s",
    dx: -55,
    dy: 35,
    rotate: 45,
  },
  {
    type: "hex",
    size: 80,
    top: "48%",
    left: "40%",
    color: "rgba(230,200,170,0.28)",
    dur: "13s",
    dx: 50,
    dy: -50,
    rotate: -25,
  },
  {
    type: "rect",
    size: 75,
    top: "5%",
    left: "15%",
    color: "rgba(190,215,200,0.28)",
    dur: "11s",
    dx: -35,
    dy: 55,
    rotate: 35,
  },
  {
    type: "hex",
    size: 95,
    top: "62%",
    left: "25%",
    color: "rgba(210,190,220,0.30)",
    dur: "13s",
    dx: 45,
    dy: -35,
    rotate: -15,
  },
  {
    type: "rect",
    size: 70,
    top: "42%",
    left: "75%",
    color: "rgba(170,220,190,0.32)",
    dur: "12s",
    dx: -50,
    dy: 40,
    rotate: 10,
  },
  {
    type: "hex",
    size: 65,
    top: "18%",
    left: "55%",
    color: "rgba(200,200,230,0.30)",
    dur: "10s",
    dx: 35,
    dy: -45,
    rotate: 40,
  },
];

function CiFloatingShapes() {
  return (
    <>
      <style>{`
        @keyframes ci-shape-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {CI_SHAPES.map((s) => (
          <div
            key={`${s.top}-${s.left}-${s.size}`}
            className="absolute blur-[3px]"
            style={
              {
                width: s.size,
                height: s.size,
                top: s.top,
                left: s.left,
                transform: `rotate(${s.rotate}deg)`,
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
                animation: `ci-shape-float ${s.dur} ease-in-out infinite`,
              } as React.CSSProperties
            }
          >
            {s.type === "hex" ? (
              <svg aria-hidden="true" viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,2 93,25 93,75 50,98 7,75 7,25"
                  fill={s.color}
                  stroke={s.color.replace(/[\d.]+\)$/, "0.4)")}
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 100 100" className="w-full h-full">
                <rect
                  x="5"
                  y="5"
                  width="90"
                  height="90"
                  rx="12"
                  fill={s.color}
                  stroke={s.color.replace(/[\d.]+\)$/, "0.4)")}
                  strokeWidth="1"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
