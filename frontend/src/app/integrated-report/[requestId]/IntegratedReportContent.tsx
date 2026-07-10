"use client";

import { useCallback, useMemo } from "react";
import {
  CI_DETAIL_AXES,
  CI_DETAIL_GROUPS,
  CI_DETAIL_LABELS,
  DetailRadarChart,
  WV_DETAIL_AXES,
  WV_DETAIL_GROUPS,
  WV_DETAIL_LABELS,
} from "@/app/components/DetailRadarChart";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
import { AiReportSection } from "@/features/ai-report/AiReportSection";
import type { ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import { getIntegratedReport } from "@/features/integrated-report/api";
import type { ResultDTO as WvResultDTO } from "@/features/work-values/api";

type Props = {
  requestId: string;
  isOwner?: boolean;
  wvResult?: WvResultDTO | null;
  ciResult?: CiResultDTO | null;
};

export function IntegratedReportContent({ requestId, isOwner = true, wvResult, ciResult }: Props) {
  const wvScores = useMemo(
    () => wvResult?.values?.map((v) => ({ id: v.valueId, score: v.displayScore })) ?? null,
    [wvResult],
  );
  const ciScores = useMemo(
    () => ciResult?.typeScores?.map((t) => ({ id: t.typeId, score: t.score })) ?? null,
    [ciResult],
  );
  const wvNeedScores = useMemo(
    () => wvResult?.needs?.map((n) => ({ id: n.needId, score: n.displayScore })) ?? null,
    [wvResult],
  );
  const ciBasicScores = useMemo(
    () => ciResult?.basicScores?.map((b) => ({ id: b.basicInterestId, score: b.score })) ?? null,
    [ciResult],
  );
  const hasCharts = !!wvScores || !!ciScores;

  const fetchReport = useCallback(() => getIntegratedReport(requestId), [requestId]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="rounded-2xl border border-gray-200/80 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
        <AiReportSection
          fetchReport={fetchReport}
          accent="amber"
          heading="統合キャリアレポート"
          variant="view"
          isOwner={isOwner}
        >
          {hasCharts && (
            <div className="mb-5">
              <div className="grid grid-cols-2 gap-1 -mx-5 md:mx-0">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-gray-400 tracking-wider">
                    Work Values
                  </span>
                  {wvScores ? (
                    <SingleRadarChart
                      scores={wvScores}
                      order={WV_ORDER}
                      fullLabels={WV_FULL_LABELS}
                      isWV={true}
                    />
                  ) : (
                    <div className="py-8 text-[13px] text-gray-300">未受診</div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-gray-400 tracking-wider">
                    Career Interest
                  </span>
                  {ciScores ? (
                    <SingleRadarChart
                      scores={ciScores}
                      order={CI_ORDER}
                      fullLabels={CI_FULL_LABELS}
                      isWV={false}
                    />
                  ) : (
                    <div className="py-8 text-[13px] text-gray-300">未受診</div>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 mt-2" />

              {wvNeedScores && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider text-center mb-1">
                    Work Values — 21 Needs
                  </p>
                  <DetailRadarChart
                    axes={WV_DETAIL_AXES}
                    labels={WV_DETAIL_LABELS}
                    groups={WV_DETAIL_GROUPS}
                    scores={wvNeedScores}
                    normalize={(s) => s / 100}
                    fillColor="rgba(72,200,140,0.18)"
                    strokeColor="#48c88c"
                    isWV={true}
                  />
                </div>
              )}

              {ciBasicScores && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider text-center mb-1">
                    Career Interest — 20 Basic Interests
                  </p>
                  <DetailRadarChart
                    axes={CI_DETAIL_AXES}
                    labels={CI_DETAIL_LABELS}
                    groups={CI_DETAIL_GROUPS}
                    scores={ciBasicScores}
                    normalize={(s) => (s - 1) / 4}
                    fillColor="rgba(160,120,220,0.18)"
                    strokeColor="#a878dc"
                    isWV={false}
                  />
                </div>
              )}

              <div className="border-t border-gray-200 mt-3" />
            </div>
          )}
        </AiReportSection>
      </div>
    </div>
  );
}
