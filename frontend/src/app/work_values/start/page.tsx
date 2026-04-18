"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { useWorkValuesQuiz, type DebugInfo } from "@/features/work-values/useWorkValuesQuiz";
import type { NeedDefDTO } from "@/features/work-values/api";
import type { NeedId } from "@/features/work-values/lib/needs";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// TODO: ログインユーザーのIDを取得する仕組みに置き換え
const TEMP_USER_ID = "5313d9df-1b19-4d3f-b158-ca0464196f55";

export default function WorkValuesStartPage() {
  const { state, start, answer, sessionId, needDefs } = useWorkValuesQuiz(TEMP_USER_ID);
  const router = useRouter();

  useEffect(() => {
    if (state.phase === "done" && sessionId) {
      router.replace(`/work_values/${sessionId}`);
    }
  }, [state.phase, sessionId, router]);

  if (state.phase === "idle") {
    return <StartScreen onStart={start} />;
  }

  if (state.phase === "loading") {
    return <LoadingScreen />;
  }

  if (state.phase === "active" && state.currentPair) {
    return (
      <QuizScreen
        pair={state.currentPair}
        questionNumber={state.questionNumber}
        maxQuestions={state.maxQuestions}
        onAnswer={answer}
        debug={state.debug}
        needDefs={needDefs}
      />
    );
  }

  if (state.phase === "submitting" || (state.phase === "done" && sessionId)) {
    return <SubmittingScreen />;
  }

  if (state.phase === "error") {
    return <ErrorScreen message={state.error} onRetry={start} />;
  }

  return null;
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen flex justify-center bg-[#f6f7f5] px-4 pt-[15vh] pb-12 relative">
      <div className="relative w-full max-w-lg h-fit text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 py-14 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />

        <div className="relative z-10 mb-10">
          <p className="text-gray-400 mb-2">
            2つの選択肢から、あなたがより重視する方を選んでください。
            <br />
            直感で答えて大丈夫です。
          </p>
        </div>

        <div className="relative z-10 -mx-10 -mb-14 mt-10 border-t border-gray-700 bg-gradient-to-t from-black/90 to-[#0a1628] px-10 py-8">
          <button
            type="button"
            onClick={onStart}
            className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base py-4 transition-colors cursor-pointer"
          >
            スタート &rarr;
          </button>
        </div>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex justify-center bg-[#f6f7f5] px-4 pt-[15vh] pb-12">
      <div className="relative w-full max-w-lg h-fit text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 py-20 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />
        <div className="relative z-10">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400 text-[15px]">診断を準備中...</p>
        </div>
      </div>
    </main>
  );
}

function QuizScreen({
  pair,
  questionNumber,
  maxQuestions,
  onAnswer,
  debug,
  needDefs,
}: {
  pair: { needA: NeedId; needB: NeedId };
  questionNumber: number;
  maxQuestions: number;
  onAnswer: (winner: NeedId) => void;
  debug: DebugInfo | null;
  needDefs: Record<string, NeedDefDTO>;
}) {
  const progress = (questionNumber / maxQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#f6f7f5] px-4 pt-[15vh] pb-8">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0a1628] border border-gray-700 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />

        {/* header */}
        <div className="relative z-10 px-8 pt-7 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`${playfair.className} text-2xl font-bold text-white`}>
                Q{questionNumber}
              </span>
              <span className="text-sm text-gray-500">/ {maxQuestions}</span>
            </div>
            <span className={`${inter.className} text-sm font-medium text-emerald-400 tabular-nums`}>
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* question */}
        <div className="relative z-10 px-8 pb-3">
          <p className="text-gray-400 text-[15px] text-center">
            仕事において、どちらがより重要ですか？
          </p>
        </div>

        {/* choices */}
        <div className="relative z-10 px-8 pb-8 flex flex-col gap-3">
          <ChoiceButton
            label={needDefs[pair.needA]?.description_ja ?? pair.needA}
            onClick={() => onAnswer(pair.needA)}
            variant="a"
          />
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-[11px] font-semibold tracking-[0.3em] text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>
          <ChoiceButton
            label={needDefs[pair.needB]?.description_ja ?? pair.needB}
            onClick={() => onAnswer(pair.needB)}
            variant="b"
          />
        </div>
      </div>

      {debug && <DebugPanel debug={debug} needDefs={needDefs} />}
    </main>
  );
}

function ChoiceButton({
  label,
  onClick,
  variant,
}: {
  label: string;
  onClick: () => void;
  variant: "a" | "b";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-gray-600/80 bg-gray-800/40 backdrop-blur-sm hover:border-emerald-400/80 hover:bg-emerald-400/10 text-white text-[17px] leading-relaxed py-6 px-7 transition-all duration-200 text-left cursor-pointer"
    >
      <span className="flex items-center gap-4">
        <span className="shrink-0 w-8 h-8 rounded-full border border-gray-600 group-hover:border-emerald-400 flex items-center justify-center text-xs font-semibold text-gray-500 group-hover:text-emerald-400 transition-colors">
          {variant === "a" ? "A" : "B"}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
}

function SubmittingScreen() {
  return (
    <main className="min-h-screen flex justify-center bg-[#f6f7f5] px-4 pt-[15vh] pb-12">
      <div className="relative w-full max-w-lg h-fit text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 py-20 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />
        <div className="relative z-10">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className={`${playfair.className} text-xl font-bold text-white mb-2`}>
            Almost there
          </p>
          <p className="text-gray-400 text-[15px]">結果を分析中...</p>
        </div>
      </div>
    </main>
  );
}

function DebugPanel({ debug, needDefs }: { debug: DebugInfo; needDefs: Record<string, NeedDefDTO> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-lg mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {open ? "Debug \u25B2" : "Debug \u25BC"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-xs font-mono shadow-sm">
          <div className="mb-3 flex gap-4">
            <BoundaryBadge
              label="Upper (3 vs 4)"
              diff={debug.boundary.upper.diff}
              seSum={debug.boundary.upper.seSum}
              stable={debug.boundary.upper.stable}
            />
            <BoundaryBadge
              label="Lower (18 vs 19)"
              diff={debug.boundary.lower.diff}
              seSum={debug.boundary.lower.seSum}
              stable={debug.boundary.lower.stable}
            />
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Need</th>
                <th className="py-1 pr-2 text-right">{"\u03BC"}</th>
                <th className="py-1 pr-2 text-right">SE</th>
                <th className="py-1 text-right">N</th>
              </tr>
            </thead>
            <tbody>
              {debug.needs.map((n) => {
                const isTop3 = n.rank <= 3;
                const isBot3 = n.rank >= 19;
                const rowColor = isTop3
                  ? "text-emerald-600"
                  : isBot3
                    ? "text-orange-500"
                    : "text-gray-600";
                return (
                  <tr key={n.needId} className={rowColor}>
                    <td className="py-0.5 pr-2">{n.rank}</td>
                    <td className="py-0.5 pr-2 truncate max-w-[140px]">
                      {needDefs[n.needId]?.label ?? n.needId}
                    </td>
                    <td className="py-0.5 pr-2 text-right tabular-nums">
                      {n.mu >= 0 ? "+" : ""}{n.mu.toFixed(2)}
                    </td>
                    <td className="py-0.5 pr-2 text-right tabular-nums">
                      {n.se.toFixed(2)}
                    </td>
                    <td className="py-0.5 text-right tabular-nums">{n.appearances}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BoundaryBadge({
  label,
  diff,
  seSum,
  stable,
}: {
  label: string;
  diff: number;
  seSum: number;
  stable: boolean;
}) {
  return (
    <div className="flex-1">
      <div className="text-gray-400 mb-0.5">{label}</div>
      <div className={stable ? "text-emerald-600" : "text-orange-500"}>
        diff={diff.toFixed(2)} seSum={seSum.toFixed(2)} {stable ? "\u2713" : "\u2717"}
      </div>
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen flex justify-center bg-[#f6f7f5] px-4 pt-[15vh] pb-12">
      <div className="relative w-full max-w-lg h-fit text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 py-14 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-full border-2 border-red-400/60 flex items-center justify-center mx-auto mb-6">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-red-400/90 text-[15px] mb-8">{message ?? "エラーが発生しました"}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 px-8 py-3 text-[15px] transition-colors cursor-pointer"
          >
            もう一度試す
          </button>
        </div>
      </div>
    </main>
  );
}

const SPHERES = [
  { size: 120, top: "-5%", left: "-5%", color: "rgba(120,140,220,0.20)", dur: "18s", dx: 40, dy: 30 },
  { size: 110, top: "-8%", left: "75%", color: "rgba(200,120,140,0.15)", dur: "22s", dx: -35, dy: 45 },
  { size: 140, top: "30%", left: "-10%",color: "rgba(100,180,190,0.13)", dur: "25s", dx: 30, dy: -40 },
  { size: 80,  top: "60%", left: "-5%", color: "rgba(170,130,210,0.18)", dur: "20s", dx: 50, dy: 25 },
  { size: 100, top: "50%", left: "78%", color: "rgba(210,170,100,0.15)", dur: "23s", dx: -40, dy: -35 },
  { size: 60,  top: "10%", left: "20%", color: "rgba(130,200,160,0.18)", dur: "16s", dx: 35, dy: 50 },
  { size: 70,  top: "5%",  left: "88%", color: "rgba(200,110,160,0.15)", dur: "19s", dx: -25, dy: 40 },
  { size: 90,  top: "78%", left: "50%", color: "rgba(110,160,220,0.15)", dur: "21s", dx: 45, dy: -30 },
  { size: 50,  top: "35%", left: "90%", color: "rgba(220,190,100,0.17)", dur: "17s", dx: -30, dy: 35 },
  { size: 110, top: "72%", left: "15%", color: "rgba(160,120,200,0.12)", dur: "26s", dx: -35, dy: -25 },
  { size: 45,  top: "-3%", left: "45%", color: "rgba(180,200,120,0.18)", dur: "15s", dx: -20, dy: 35 },
  { size: 100, top: "80%", left: "80%", color: "rgba(120,180,200,0.15)", dur: "24s", dx: 30, dy: -20 },
];

function FloatingSpheres() {
  return (
    <>
      <style>{`
        @keyframes sphere-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {SPHERES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[5px]"
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, ${s.color} 40%, rgba(0,0,0,0.3) 100%)`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              animation: `sphere-float ${s.dur} ease-in-out infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}
