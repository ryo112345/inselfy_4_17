"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { WorkValuesResultContent } from "@/app/work_values/[sessionId]/WorkValuesContent";
import { CareerInterestResultContent } from "@/app/career_interest/[sessionId]/CareerInterestContent";

type Props = {
  children: ReactNode;
  username: string;
  wvSessionId: string | null;
  ciSessionId: string | null;
  initialPanel?: number;
};

export function PanelNavigator({ children, username, wvSessionId, ciSessionId, initialPanel = 0 }: Props) {
  const urls = [
    `/profile/${username}`,
    wvSessionId ? `/work_values/${wvSessionId}` : `/profile/${username}`,
    ciSessionId ? `/career_interest/${ciSessionId}` : `/profile/${username}`,
  ];
  const panelCount = 3;

  const [activeIndex, setActiveIndex] = useState(initialPanel);
  const [expanded, setExpanded] = useState(false);

  const goTo = (index: number) => {
    if (index < 0 || index >= panelCount) return;
    setActiveIndex(index);
    window.history.replaceState(null, "", urls[index]);
  };

  const panelPx = 672;
  const gapPx = 12;

  const focusedTransform = `calc(50% - ${panelPx / 2}px - ${activeIndex * (panelPx + gapPx)}px)`;
  const expandedTransform = `-${activeIndex * (panelPx + gapPx)}px`;

  return (
    <div className="relative px-4 overflow-hidden">
      <div
        className="flex items-start transition-all duration-300 ease-in-out"
        style={{
          gap: `${gapPx}px`,
          transform: `translateX(${expanded ? expandedTransform : focusedTransform})`,
        }}
      >
        <div className="shrink-0" style={{ width: `${panelPx}px` }}>{children}</div>

        <div className="shrink-0" style={{ width: `${panelPx}px` }}>
          {wvSessionId ? (
            <WorkValuesResultContent sessionId={wvSessionId} />
          ) : (
            <WorkValuesPlaceholder />
          )}
        </div>

        <div className="shrink-0" style={{ width: `${panelPx}px` }}>
          {ciSessionId ? (
            <CareerInterestResultContent sessionId={ciSessionId} />
          ) : (
            <CareerInterestPlaceholder />
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1">
        <button
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 cursor-pointer"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {expanded ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
        </button>
        <button
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === panelCount - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function WorkValuesPlaceholder() {
  return (
    <div className="relative mx-auto max-w-2xl text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)] flex flex-col min-h-[520px]">
      <WvFloatingSpheres />

      <div className="relative z-10 mb-6 flex-1">
        <span className="inline-block rounded-full border border-emerald-400/40 px-5 py-1.5 text-[13px] font-semibold tracking-[0.15em] text-emerald-400 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle" />
          SELF-ASSESSMENT SYSTEM
        </span>

        <h2 className="text-[42px] font-bold text-white leading-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Work Values
        </h2>
        <p className="text-[16px] text-gray-300 tracking-[0.3em] mb-6">
          価 値 観 診 断
        </p>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          21の仕事価値観を一対比較で測定し、
          <br />
          あなたの内なるコンパスを可視化します。
        </p>

        <div className="flex justify-center gap-8 mt-8">
          <div>
            <span className="text-[32px] font-bold text-white">70</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">PAIRS</span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-white">21</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">NEEDS</span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-white">10</span>
            <span className="text-[13px] font-semibold text-emerald-400 tracking-wider ml-1.5">MIN</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mx-10 mt-10 border-t border-gray-700 bg-gradient-to-t from-black/90 to-[#0a1628] px-10 py-8">
        <Link
          href="/work_values/start"
          className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base py-4 transition-colors text-center"
        >
          診断を開始する &rarr;
        </Link>
      </div>
    </div>
  );
}

function CareerInterestPlaceholder() {
  return (
    <div className="relative mx-auto max-w-2xl text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex flex-col min-h-[520px]">
      <CiFloatingShapes />

      <div className="relative z-10 mb-6 flex-1">
        <span className="inline-block rounded-full border border-blue-400/40 px-5 py-1.5 text-[13px] font-semibold tracking-[0.15em] text-blue-500 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />
          SELF-ASSESSMENT SYSTEM
        </span>

        <h2 className="text-[42px] font-bold text-gray-800 leading-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Career Interest
        </h2>
        <p className="text-[16px] text-gray-600 tracking-[0.3em] mb-6">
          職 業 興 味 診 断
        </p>
        <p className="text-[15px] text-gray-500 leading-relaxed">
          各活動への興味度を5段階で評価してください。
          <br />
          直感で答えて大丈夫です。
        </p>

        <div className="flex justify-center gap-8 mt-8">
          <div>
            <span className="text-[32px] font-bold text-gray-800">60</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">QUESTIONS</span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">20</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">TYPES</span>
          </div>
          <div>
            <span className="text-[32px] font-bold text-gray-800">10</span>
            <span className="text-[13px] font-semibold text-blue-500 tracking-wider ml-1.5">MIN</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mx-10 mt-10 border-t border-gray-200 bg-white px-10 py-8">
        <Link
          href="/career_interest/start"
          className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors text-center"
        >
          診断を開始する &rarr;
        </Link>
      </div>
    </div>
  );
}

const WV_SPHERES = [
  { size: 180, top: "-8%", left: "-6%", color: "rgba(90,120,240,0.25)", dur: "28s", dx: 70, dy: 55 },
  { size: 160, top: "55%", left: "68%", color: "rgba(220,80,120,0.22)", dur: "32s", dx: -60, dy: -50 },
  { size: 150, top: "72%", left: "-5%", color: "rgba(180,80,240,0.22)", dur: "36s", dx: 65, dy: -45 },
  { size: 170, top: "35%", left: "10%", color: "rgba(140,100,230,0.22)", dur: "30s", dx: -50, dy: -60 },
  { size: 110, top: "-5%", left: "72%", color: "rgba(240,170,60,0.24)", dur: "24s", dx: -65, dy: 55 },
  { size: 100, top: "38%", left: "-8%", color: "rgba(50,200,180,0.24)", dur: "26s", dx: 75, dy: -40 },
  { size: 105, top: "80%", left: "55%", color: "rgba(60,140,240,0.22)", dur: "28s", dx: -55, dy: -50 },
  { size: 95, top: "12%", left: "38%", color: "rgba(80,220,140,0.24)", dur: "22s", dx: -45, dy: 65 },
  { size: 90, top: "25%", left: "82%", color: "rgba(240,200,60,0.24)", dur: "24s", dx: -60, dy: 40 },
  { size: 85, top: "30%", left: "58%", color: "rgba(230,80,180,0.22)", dur: "26s", dx: 50, dy: -55 },
  { size: 80, top: "78%", left: "30%", color: "rgba(160,230,80,0.24)", dur: "22s", dx: 55, dy: -45 },
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
        {WV_SPHERES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[2px]"
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, ${s.color} 40%, rgba(0,0,0,0.3) 100%)`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              animation: `wv-sphere-float ${s.dur} ease-in-out infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

const CI_SHAPES = [
  { type: "hex", size: 160, top: "-8%", left: "-10%", color: "rgba(180,220,210,0.35)", dur: "14s", dx: 60, dy: 45, rotate: 15 },
  { type: "rect", size: 150, top: "55%", left: "65%", color: "rgba(200,180,220,0.35)", dur: "16s", dx: -55, dy: -50, rotate: 20 },
  { type: "hex", size: 140, top: "35%", left: "8%", color: "rgba(240,210,180,0.30)", dur: "15s", dx: -45, dy: -55, rotate: 25 },
  { type: "rect", size: 110, top: "-5%", left: "70%", color: "rgba(180,200,230,0.30)", dur: "12s", dx: -60, dy: 50, rotate: -15 },
  { type: "hex", size: 100, top: "70%", left: "-5%", color: "rgba(170,210,200,0.30)", dur: "13s", dx: 65, dy: -40, rotate: -20 },
  { type: "rect", size: 105, top: "78%", left: "50%", color: "rgba(190,220,210,0.28)", dur: "14s", dx: -50, dy: -45, rotate: 30 },
  { type: "hex", size: 90, top: "10%", left: "35%", color: "rgba(160,210,200,0.35)", dur: "11s", dx: -40, dy: 60, rotate: -10 },
  { type: "rect", size: 85, top: "25%", left: "80%", color: "rgba(180,195,230,0.30)", dur: "12s", dx: -55, dy: 35, rotate: 45 },
  { type: "hex", size: 80, top: "48%", left: "40%", color: "rgba(230,200,170,0.28)", dur: "13s", dx: 50, dy: -50, rotate: -25 },
  { type: "rect", size: 75, top: "5%", left: "15%", color: "rgba(190,215,200,0.28)", dur: "11s", dx: -35, dy: 55, rotate: 35 },
  { type: "hex", size: 95, top: "62%", left: "25%", color: "rgba(210,190,220,0.30)", dur: "13s", dx: 45, dy: -35, rotate: -15 },
  { type: "rect", size: 70, top: "42%", left: "75%", color: "rgba(170,220,190,0.32)", dur: "12s", dx: -50, dy: 40, rotate: 10 },
  { type: "hex", size: 65, top: "18%", left: "55%", color: "rgba(200,200,230,0.30)", dur: "10s", dx: 35, dy: -45, rotate: 40 },
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
        {CI_SHAPES.map((s, i) => (
          <div
            key={i}
            className="absolute blur-[3px]"
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              transform: `rotate(${s.rotate}deg)`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              animation: `ci-shape-float ${s.dur} ease-in-out infinite`,
            } as React.CSSProperties}
          >
            {s.type === "hex" ? (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,2 93,25 93,75 50,98 7,75 7,25"
                  fill={s.color}
                  stroke={s.color.replace(/[\d.]+\)$/, "0.4)")}
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
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
