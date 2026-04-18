"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { getResultBySessionId, type ResultDTO } from "@/features/work-values/api";
import { NEED_LABELS, type NeedId } from "@/features/work-values/lib/needs";

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

export default function WorkValuesResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<ResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getResultBySessionId(sessionId)
      .then(setResult)
      .catch(() => setError("診断結果が見つかりませんでした"));
  }, [sessionId]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4">
        <p className="text-gray-400">{error}</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

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
