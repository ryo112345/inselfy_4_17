"use client";

import { useState } from "react";
import { Playfair_Display, Inter } from "next/font/google";
import { useWorkValuesQuiz, type DebugInfo } from "@/features/work-values/useWorkValuesQuiz";
import { NEED_LABELS, type NeedId } from "@/features/work-values/lib/needs";
import type { ResultDTO } from "@/features/work-values/api";

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
  const { state, start, answer } = useWorkValuesQuiz(TEMP_USER_ID);

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
      />
    );
  }

  if (state.phase === "submitting") {
    return <SubmittingScreen />;
  }

  if (state.phase === "done" && state.result) {
    return <ResultScreen result={state.result} />;
  }

  if (state.phase === "error") {
    return <ErrorScreen message={state.error} onRetry={start} />;
  }

  return null;
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4">
      <div className="text-center">
        <p className="text-gray-400 mb-8">
          2つの選択肢から、あなたがより重視する方を選んでください。
          <br />
          直感で答えて大丈夫です。
        </p>
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base px-12 py-4 transition-colors"
        >
          スタート
        </button>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a1628]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">診断を準備中...</p>
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
}: {
  pair: { needA: NeedId; needB: NeedId };
  questionNumber: number;
  maxQuestions: number;
  onAnswer: (winner: NeedId) => void;
  debug: DebugInfo | null;
}) {
  const progress = (questionNumber / maxQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a1628] px-4 py-8">
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>
            Q{questionNumber} / {maxQuestions}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-gray-300 text-sm mb-6">仕事において、どちらがより重要ですか？</p>

      <div className="w-full max-w-lg flex flex-col gap-4">
        <ChoiceButton
          label={NEED_LABELS[pair.needA]}
          onClick={() => onAnswer(pair.needA)}
        />
        <div className="text-center text-gray-500 text-xs font-medium tracking-widest">OR</div>
        <ChoiceButton
          label={NEED_LABELS[pair.needB]}
          onClick={() => onAnswer(pair.needB)}
        />
      </div>

      {debug && <DebugPanel debug={debug} />}
    </main>
  );
}

function ChoiceButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-gray-600 bg-gray-800/50 hover:border-emerald-400 hover:bg-emerald-400/10 text-white text-lg py-6 px-8 transition-all duration-200 text-left"
    >
      {label}
    </button>
  );
}

function SubmittingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a1628]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">結果を送信中...</p>
      </div>
    </main>
  );
}

function ResultScreen({ result }: { result: ResultDTO }) {
  const sorted = [...result.needs].sort((a, b) => b.mu - a.mu);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  return (
    <main className="min-h-screen bg-[#0a1628] px-4 py-12">
      <div className="max-w-lg mx-auto">
        <h1
          className={`${playfair.className} text-3xl font-bold text-white text-center mb-2`}
        >
          Your Work Values
        </h1>
        <p className="text-gray-400 text-center text-sm mb-10">
          {result.question_count}問の回答から分析しました
        </p>

        <section className="mb-10">
          <h2 className="text-emerald-400 text-sm font-semibold tracking-widest mb-4">
            TOP 3 — あなたが重視するもの
          </h2>
          <div className="flex flex-col gap-3">
            {top3.map((need, i) => (
              <NeedCard
                key={need.need_id}
                rank={i + 1}
                needId={need.need_id as NeedId}
                mu={need.mu}
                variant="top"
              />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-orange-400 text-sm font-semibold tracking-widest mb-4">
            BOTTOM 3 — あなたが重視しないもの
          </h2>
          <div className="flex flex-col gap-3">
            {bottom3.map((need, i) => (
              <NeedCard
                key={need.need_id}
                rank={sorted.length - 2 + i}
                needId={need.need_id as NeedId}
                mu={need.mu}
                variant="bottom"
              />
            ))}
          </div>
        </section>

        {result.consistency_level && (
          <div className="text-center text-xs text-gray-500">
            整合性: {result.consistency_level}
            {result.consistency_coefficient != null &&
              ` (${(result.consistency_coefficient * 100).toFixed(1)}%)`}
          </div>
        )}
      </div>
    </main>
  );
}

function NeedCard({
  rank,
  needId,
  mu,
  variant,
}: {
  rank: number;
  needId: NeedId;
  mu: number;
  variant: "top" | "bottom";
}) {
  const displayScore = Math.round(100 / (1 + Math.exp(-mu)));
  const accentColor = variant === "top" ? "text-emerald-400" : "text-orange-400";
  const barColor = variant === "top" ? "bg-emerald-400" : "bg-orange-400";

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 flex items-center gap-4">
      <span className={`${inter.className} text-2xl font-light ${accentColor} w-8 text-center`}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm mb-1">{NEED_LABELS[needId]}</p>
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full`}
            style={{ width: `${displayScore}%` }}
          />
        </div>
      </div>
      <span className={`${inter.className} text-lg font-medium ${accentColor}`}>
        {displayScore}
      </span>
    </div>
  );
}

function DebugPanel({ debug }: { debug: DebugInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-lg mt-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {open ? "Debug \u25B2" : "Debug \u25BC"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-gray-700 bg-gray-900/80 p-4 text-xs font-mono">
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
              <tr className="text-gray-500 text-left">
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
                  ? "text-emerald-400"
                  : isBot3
                    ? "text-orange-400"
                    : "text-gray-400";
                return (
                  <tr key={n.needId} className={rowColor}>
                    <td className="py-0.5 pr-2">{n.rank}</td>
                    <td className="py-0.5 pr-2 truncate max-w-[140px]">
                      {NEED_LABELS[n.needId]}
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
      <div className="text-gray-500 mb-0.5">{label}</div>
      <div className={stable ? "text-emerald-400" : "text-orange-400"}>
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
    <main className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4">
      <div className="text-center">
        <p className="text-red-400 mb-4">{message ?? "エラーが発生しました"}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-gray-600 text-gray-300 hover:text-white px-8 py-3 transition-colors"
        >
          もう一度試す
        </button>
      </div>
    </main>
  );
}
