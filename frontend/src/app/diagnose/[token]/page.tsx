"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { useWorkValuesQuiz } from "@/features/work-values/useWorkValuesQuiz";
import { useCareerInterestQuiz } from "@/features/career-interest/useCareerInterestQuiz";
import type { NeedId } from "@/features/work-values/lib/needs";
import type { ItemDTO } from "@/features/career-interest/api";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "swap" });

type MemberInfo = {
  member_id: string;
  member_name: string;
  team_name: string;
  company_name: string;
  user_id: string;
  wv_status: string;
  ci_status: string;
};

type PagePhase = "loading" | "invalid" | "welcome" | "wv" | "wv_done" | "ci" | "done";

const SCORE_OPTIONS = [
  { value: 1, label: "全く興味がない" },
  { value: 2, label: "あまり興味がない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "やや興味がある" },
  { value: 5, label: "とても興味がある" },
] as const;

export default function DiagnosePage() {
  const params = useParams();
  const token = params.token as string;

  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [phase, setPhase] = useState<PagePhase>("loading");

  useEffect(() => {
    fetch(`/api/team-diagnose/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: MemberInfo) => {
        setMemberInfo(data);
        if (data.wv_status === "completed" && data.ci_status === "completed") {
          setPhase("done");
        } else if (data.wv_status === "completed") {
          setPhase("wv_done");
        } else {
          setPhase("welcome");
        }
      })
      .catch(() => setPhase("invalid"));
  }, [token]);

  const updateStatus = useCallback(
    async (field: "wv_status" | "ci_status") => {
      await fetch(`/api/team-diagnose/${token}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: "completed" }),
      });
    },
    [token],
  );

  if (phase === "loading") return <LoadingScreen />;

  if (phase === "invalid") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4">
        <div className="w-full max-w-md text-center rounded-3xl bg-white border border-gray-200 p-12 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <circle cx={12} cy={12} r={10} />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">無効なリンクです</p>
          <p className="text-sm text-gray-500">このリンクは無効か、期限が切れています。</p>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4">
        <div className="w-full max-w-md text-center rounded-3xl bg-white border border-gray-200 p-12 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">すべての診断が完了しました</p>
          <p className="text-sm text-gray-500">
            ご協力ありがとうございました。結果は{memberInfo?.company_name}の担当者に共有されます。
          </p>
        </div>
      </main>
    );
  }

  if (!memberInfo) return null;

  if (phase === "welcome") {
    return (
      <WelcomeScreen
        memberInfo={memberInfo}
        onStart={() => setPhase("wv")}
      />
    );
  }

  if (phase === "wv") {
    return (
      <WVQuizWrapper
        userId={memberInfo.user_id}
        onComplete={() => {
          updateStatus("wv_status");
          setPhase("wv_done");
        }}
      />
    );
  }

  if (phase === "wv_done") {
    return (
      <TransitionScreen
        title="価値観診断が完了しました"
        subtitle="続けて職業興味診断を受けてください"
        buttonLabel="職業興味診断を開始 →"
        onNext={() => setPhase("ci")}
      />
    );
  }

  if (phase === "ci") {
    return (
      <CIQuizWrapper
        userId={memberInfo.user_id}
        onComplete={() => {
          updateStatus("ci_status");
          setPhase("done");
        }}
      />
    );
  }

  return null;
}

function WelcomeScreen({ memberInfo, onStart }: { memberInfo: MemberInfo; onStart: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 p-10 shadow-sm text-center">
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">{memberInfo.company_name}</p>
          <p className="text-sm text-gray-600 font-medium">{memberInfo.team_name}</p>
        </div>

        <p className="text-xl font-bold text-gray-900 mb-2">
          {memberInfo.member_name}さん
        </p>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          チームの傾向を分析するため、2つの診断を受けていただきます。<br />
          所要時間は合計で約20分です。
        </p>

        <div className="space-y-3 mb-8">
          <DiagnosticItem
            number={1}
            label="価値観診断（Work Values）"
            description="仕事で大切にしている価値観を測定します"
            time="約10分"
          />
          <DiagnosticItem
            number={2}
            label="職業興味診断（Career Interest）"
            description="職業に対する興味の傾向を測定します"
            time="約10分"
          />
        </div>

        <button
          onClick={onStart}
          className="w-full rounded-xl bg-[#2979ff] hover:bg-[#1565c0] text-white font-semibold py-4 text-base transition-colors cursor-pointer"
        >
          診断を開始する →
        </button>
      </div>
    </main>
  );
}

function DiagnosticItem({ number, label, description, time }: {
  number: number; label: string; description: string; time: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-100 p-4 text-left">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2979ff] text-white text-xs font-bold shrink-0">
        {number}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function TransitionScreen({ title, subtitle, buttonLabel, onNext }: {
  title: string; subtitle: string; buttonLabel: string; onNext: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4">
      <div className="w-full max-w-md text-center rounded-3xl bg-white border border-gray-200 p-12 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-lg font-bold text-gray-900 mb-2">{title}</p>
        <p className="text-sm text-gray-500 mb-8">{subtitle}</p>
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-[#2979ff] hover:bg-[#1565c0] text-white font-semibold py-4 text-base transition-colors cursor-pointer"
        >
          {buttonLabel}
        </button>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-[#2979ff]" />
    </main>
  );
}

/* ─────────── WV Quiz Wrapper ─────────── */

function WVQuizWrapper({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const { state, start, answer, needDefs } = useWorkValuesQuiz(userId);

  useEffect(() => {
    if (state.phase === "done") onComplete();
  }, [state.phase, onComplete]);

  if (state.phase === "idle") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
        <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <div className="relative z-10 mb-10">
            <p className={`${playfair.className} text-3xl font-bold text-white mb-4`}>
              Work Values
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              2つの選択肢から、自分にとってより大切な方を選んでください。<br />
              直感で答えて大丈夫です。
            </p>
          </div>
          <div className="relative z-10 -mx-10 border-t border-gray-700 bg-gray-900/50 px-8 pt-6 pb-8">
            <button
              type="button"
              onClick={start}
              className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base py-4 transition-colors cursor-pointer"
            >
              スタート &rarr;
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (state.phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (state.phase === "active" && state.currentPair) {
    const { needA, needB } = state.currentPair;
    const progress = (state.questionNumber / state.maxQuestions) * 100;

    return (
      <main className="min-h-screen flex flex-col items-center bg-[#0a1628] px-4 pt-[12vh] pb-8">
        <div className="relative w-full max-w-lg rounded-3xl bg-[#111d32] border border-gray-700 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <div className="px-8 pt-7 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`${playfair.className} text-2xl font-bold text-white`}>
                  Q{state.questionNumber}
                </span>
                <span className="text-sm text-gray-500">/ {state.maxQuestions}</span>
              </div>
              <span className={`${inter.className} text-sm font-medium text-emerald-400 tabular-nums`}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-8 pb-3">
            <p className="text-gray-500 text-[13px] text-center">どちらがあなたにとって大切ですか？</p>
          </div>

          <div className="px-8 pb-8 flex flex-col gap-3">
            {[
              { label: "A", needId: needA },
              { label: "B", needId: needB },
            ].map(({ label, needId }) => (
              <button
                key={needId}
                type="button"
                onClick={() => answer(needId)}
                className="group w-full rounded-2xl border border-gray-600/80 bg-gray-800/40 hover:border-emerald-400/80 hover:bg-emerald-400/10 text-gray-200 text-[15px] leading-relaxed py-5 px-6 transition-all duration-200 text-left cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full border border-gray-600 group-hover:border-emerald-400 flex items-center justify-center text-sm font-semibold text-gray-400 group-hover:text-emerald-400 transition-colors">
                    {label}
                  </span>
                  <span>{needDefs[needId]?.description_ja ?? needId}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (state.phase === "submitting") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400">結果を分析中...</p>
        </div>
      </main>
    );
  }

  if (state.phase === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-red-400 mb-4">{state.error ?? "エラーが発生しました"}</p>
          <button onClick={start} className="text-gray-400 hover:text-white underline cursor-pointer">
            もう一度試す
          </button>
        </div>
      </main>
    );
  }

  return null;
}

/* ─────────── CI Quiz Wrapper ─────────── */

function CIQuizWrapper({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const { state, start, answer } = useCareerInterestQuiz(userId);

  useEffect(() => {
    if (state.phase === "done") onComplete();
  }, [state.phase, onComplete]);

  if (state.phase === "idle") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
        <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
          <div className="relative z-10 mb-10">
            <p className={`${playfair.className} text-3xl font-bold text-gray-800 mb-4`}>
              Career Interest
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              各活動への興味度を5段階で評価してください。<br />
              直感で答えて大丈夫です。
            </p>
          </div>
          <div className="relative z-10 -mx-10 border-t border-gray-200 bg-white px-8 pt-6 pb-8">
            <button
              type="button"
              onClick={start}
              className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors cursor-pointer"
            >
              スタート &rarr;
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (state.phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (state.phase === "active" && state.currentItem) {
    return <CIQuizScreen item={state.currentItem} questionNumber={state.questionNumber} maxQuestions={state.maxQuestions} onAnswer={answer} />;
  }

  if (state.phase === "submitting") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-500">結果を分析中...</p>
        </div>
      </main>
    );
  }

  if (state.phase === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-red-500 mb-4">{state.error ?? "エラーが発生しました"}</p>
          <button onClick={start} className="text-gray-500 hover:text-gray-800 underline cursor-pointer">
            もう一度試す
          </button>
        </div>
      </main>
    );
  }

  return null;
}

function CIQuizScreen({ item, questionNumber, maxQuestions, onAnswer }: {
  item: ItemDTO; questionNumber: number; maxQuestions: number; onAnswer: (score: number) => void;
}) {
  const progress = (questionNumber / maxQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#f6f7f5] px-4 pt-[12vh] pb-8">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#e8f0fa] border border-gray-200 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <div className="px-8 pt-7 pb-5">
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
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="px-8 pb-4">
          <p className="text-gray-800 text-[17px] leading-relaxed text-center">{item.text_ja}</p>
        </div>
        <div className="px-8 pb-3">
          <p className="text-gray-400 text-[13px] text-center">この活動にどの程度興味がありますか？</p>
        </div>

        <div className="px-8 pb-8 flex flex-col gap-2">
          {SCORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAnswer(opt.value)}
              className="group w-full rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50/80 text-gray-700 text-[15px] leading-relaxed py-4 px-6 transition-all duration-200 text-left cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full border border-gray-300 group-hover:border-blue-400 flex items-center justify-center text-xs font-semibold text-gray-400 group-hover:text-blue-500 transition-colors">
                  {opt.value}
                </span>
                <span>{opt.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
