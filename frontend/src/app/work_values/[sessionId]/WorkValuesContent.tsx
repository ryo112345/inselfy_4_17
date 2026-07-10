"use client";

import { useCallback, useEffect, useState } from "react";
import { AiReportSection } from "@/features/ai-report/AiReportSection";
import { getAiReport, getResultBySessionId, type ResultDTO } from "@/features/work-values/api";
import { NeedsSection } from "@/features/work-values/components/NeedsSection";
import { TopValuesCodeSection } from "@/features/work-values/components/TopValuesCodeSection";
import { DEFAULT_BADGE, SCORE_COLORS } from "@/features/work-values/components/theme";
import { ValuesSection } from "@/features/work-values/components/ValuesSection";

export function WorkValuesResultContent({
  sessionId,
  initialData,
  isOwner,
}: {
  sessionId: string;
  initialData?: ResultDTO | null;
  isOwner: boolean;
}) {
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

  const fetchReport = useCallback(() => getAiReport(sessionId), [sessionId]);

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

  const needScoreMap = new Map(result.needs.map((n) => [n.needId, n]));
  const sortedValues = [...result.values].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
      <TopValuesCodeSection values={sortedValues} createdAt={result.createdAt} />
      <ValuesSection values={sortedValues} colors={colors} badge={badge} />
      <NeedsSection
        values={sortedValues}
        needScoreMap={needScoreMap}
        colors={colors}
        badge={badge}
      />

      <AiReportSection
        fetchReport={fetchReport}
        accent="emerald"
        heading="AI キャリアレポート"
        variant="generate"
        isOwner={isOwner}
        className="mt-10"
      />
    </div>
  );
}
