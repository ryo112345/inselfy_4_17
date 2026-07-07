"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { useCareerInterestQuiz } from "@/features/career-interest/useCareerInterestQuiz";
import type { ItemDTO } from "@/features/career-interest/api";
import { useAuth } from "@/features/auth/auth-context";

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

const SCORE_OPTIONS = [
  { value: 1, label: "全く\n興味がない" },
  { value: 2, label: "あまり\n興味がない" },
  { value: 3, label: "どちらとも\nいえない" },
  { value: 4, label: "やや\n興味がある" },
  { value: 5, label: "とても\n興味がある" },
] as const;

export default function CareerInterestStartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { state, start, answer, submit, sessionId } = useCareerInterestQuiz();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (state.phase === "done" && sessionId) {
      router.replace(`/career_interest/${sessionId}`);
    }
  }, [state.phase, sessionId, router]);

  if (authLoading || !user) {
    return <LoadingScreen />;
  }

  if (state.phase === "idle") {
    return <StartScreen onStart={start} />;
  }

  if (state.phase === "loading") {
    return <LoadingScreen />;
  }

  if (state.phase === "active" && state.currentItem) {
    return (
      <QuizScreen
        item={state.currentItem}
        questionNumber={state.questionNumber}
        maxQuestions={state.maxQuestions}
        onAnswer={answer}
      />
    );
  }

  if (state.phase === "completed") {
    return <CompletedScreen onSubmit={submit} />;
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
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />

        <div className="relative z-10 mb-10">
          <p className="text-gray-500 mb-2">
            各活動への興味度を5段階で評価してください。
            <br />
            直感で答えて大丈夫です。
          </p>
        </div>

        <div className="relative z-10 -mx-10 border-t border-gray-200 bg-white px-8 pt-6 pb-8">
          <button
            type="button"
            onClick={onStart}
            className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors cursor-pointer"
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
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 py-20 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />
        <div className="relative z-10">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-500 text-[15px]">診断を準備中...</p>
        </div>
      </div>
    </main>
  );
}

function QuizScreen({
  item,
  questionNumber,
  maxQuestions,
  onAnswer,
}: {
  item: ItemDTO;
  questionNumber: number;
  maxQuestions: number;
  onAnswer: (score: number) => void;
}) {
  const progress = (questionNumber / maxQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#f6f7f5] px-4 pt-[12vh] pb-8">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#e8f0fa] border border-gray-200 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />

        {/* header */}
        <div className="relative z-10 px-8 pt-7 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`${playfair.className} text-2xl font-bold text-gray-800`}>
                Q{questionNumber}
              </span>
              <span className="text-sm text-gray-400">/ {maxQuestions}</span>
            </div>
            <span className={`${inter.className} text-sm font-medium text-blue-500 tabular-nums`}>
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* question text */}
        <div className="relative z-10 px-8 pb-2">
          <p className="text-gray-800 text-[17px] leading-relaxed text-center">
            {item.textJa}
          </p>
        </div>

        {/* prompt */}
        <div className="relative z-10 px-8 pb-5">
          <p className="text-gray-500 text-[15px] text-center">
            この活動にどの程度興味がありますか？
          </p>
        </div>

        {/* score buttons */}
        <div className="relative z-10 px-4 pb-8">
          <div
            className="flex gap-1"
            role="radiogroup"
            aria-label="興味度を選択"
          >
            {SCORE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={false}
                aria-label={opt.label.replace("\n", "")}
                onClick={() => onAnswer(opt.value)}
                className="group flex-1 flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50/80 active:scale-95 py-3.5 transition-all duration-150 cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full border-2 border-gray-300 group-hover:border-blue-400 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center text-base font-bold text-gray-400 transition-all duration-150">
                  {opt.value}
                </span>
                <span className="text-[12px] text-gray-600 group-hover:text-blue-600 transition-colors leading-snug text-center whitespace-pre-line">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function CompletedScreen({ onSubmit }: { onSubmit: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-full border-2 border-blue-400/60 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className={`${playfair.className} text-xl font-bold text-gray-800 mb-3`}>
            診断おつかれさまでした！
          </p>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            すべての質問に回答しました。
            <br />
            回答を送信して結果を確認しましょう。
          </p>
        </div>

        <div className="relative z-10 -mx-10 mt-10 border-t border-gray-200 bg-white px-8 pt-6 pb-8">
          <button
            type="button"
            onClick={onSubmit}
            className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors cursor-pointer"
          >
            回答を送信する &rarr;
          </button>
        </div>
      </div>
    </main>
  );
}

function SubmittingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 py-20 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />
        <div className="relative z-10">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className={`${playfair.className} text-xl font-bold text-gray-800 mb-2`}>
            Almost there
          </p>
          <p className="text-gray-500 text-[15px]">結果を分析中...</p>
        </div>
      </div>
    </main>
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
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 py-14 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-full border-2 border-red-300 flex items-center justify-center mx-auto mb-6">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-red-500/90 text-[15px] mb-8">{message ?? "エラーが発生しました"}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 px-8 py-3 text-[15px] transition-colors cursor-pointer"
          >
            もう一度試す
          </button>
        </div>
      </div>
    </main>
  );
}

const SHAPES = [
  { type: "hex", size: 130, top: "-8%", left: "-10%", color: "rgba(180,220,210,0.35)", dur: "20s", dx: 20, dy: 15, rotate: 15 },
  { type: "hex", size: 90, top: "8%", left: "75%", color: "rgba(170,210,200,0.30)", dur: "18s", dx: -15, dy: 25, rotate: -10 },
  { type: "rect", size: 100, top: "-5%", left: "38%", color: "rgba(180,200,230,0.30)", dur: "22s", dx: 15, dy: -20, rotate: 30 },
  { type: "rect", size: 75, top: "18%", left: "85%", color: "rgba(200,180,220,0.35)", dur: "17s", dx: -20, dy: 15, rotate: -20 },
  { type: "hex", size: 110, top: "28%", left: "-8%", color: "rgba(240,210,180,0.30)", dur: "24s", dx: 25, dy: -15, rotate: 25 },
  { type: "rect", size: 65, top: "6%", left: "20%", color: "rgba(160,210,200,0.35)", dur: "16s", dx: -10, dy: 20, rotate: 45 },
  { type: "hex", size: 80, top: "52%", left: "80%", color: "rgba(190,220,210,0.28)", dur: "21s", dx: -20, dy: -15, rotate: -30 },
  { type: "rect", size: 85, top: "45%", left: "0%", color: "rgba(180,195,230,0.30)", dur: "19s", dx: 15, dy: 20, rotate: 10 },
  { type: "hex", size: 120, top: "32%", left: "38%", color: "rgba(230,200,170,0.20)", dur: "23s", dx: -12, dy: 18, rotate: -15 },
  { type: "rect", size: 55, top: "62%", left: "42%", color: "rgba(190,215,200,0.28)", dur: "18s", dx: 18, dy: -12, rotate: 35 },
];

function FloatingShapes() {
  return (
    <>
      <style>{`
        @keyframes shape-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {SHAPES.map((s, i) => (
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
              animation: `shape-float ${s.dur} ease-in-out infinite`,
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
