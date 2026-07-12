"use client";

import { useCallback, useEffect, useState } from "react";
import { AiReportSection } from "@/features/ai-report/AiReportSection";
import {
  getAiReport,
  getResultBySessionId,
  requestAiReport,
  type ResultDTO,
} from "@/features/career-interest/api";
import { BasicInterestsSection } from "@/features/career-interest/components/BasicInterestsSection";
import { TopRIASECHeroSection } from "@/features/career-interest/components/TopRIASECHeroSection";
import { TypesSection } from "@/features/career-interest/components/TypesSection";
import { DEFAULT_BADGE, SCORE_COLORS } from "@/features/career-interest/components/theme";

export function CareerInterestResultContent({
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
  const requestReport = useCallback(() => requestAiReport(sessionId), [sessionId]);

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

  const basicScoreMap = new Map(result.basicScores.map((b) => [b.basicInterestId, b]));
  const sortedTypes = [...result.typeScores].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-sm px-6 pt-5 pb-8">
      <TopRIASECHeroSection types={sortedTypes} createdAt={result.createdAt} />
      <TypesSection types={sortedTypes} colors={colors} badge={badge} />
      <BasicInterestsSection
        types={sortedTypes}
        basicScoreMap={basicScoreMap}
        colors={colors}
        badge={badge}
      />

      <AiReportSection
        fetchReport={fetchReport}
        requestReport={requestReport}
        initialRequested={result.reportRequested}
        accent="purple"
        heading="AI キャリアレポート"
        variant="generate"
        isOwner={isOwner}
        className="mt-10"
      />
    </div>
  );
}
