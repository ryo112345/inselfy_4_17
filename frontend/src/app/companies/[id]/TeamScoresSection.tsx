"use client";

import { useState } from "react";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";

type PublicTeamScore = {
  teamId: string;
  teamName: string;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
  memberCount: number;
  completedCount: number;
};

export function TeamScoresSection({
  teams,
  cardClass,
}: {
  teams: PublicTeamScore[];
  cardClass: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  const teamsWithScores = teams.filter((t) => t.wvScores || t.ciScores);
  if (teamsWithScores.length === 0) return null;

  const team = teamsWithScores[activeIdx] ?? teamsWithScores[0];

  return (
    <section className={`py-5 ${cardClass}`}>
      <div className="px-6">
        <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
          チーム診断結果
        </h2>
      </div>

      {teamsWithScores.length > 1 && (
        <div className="mt-4 flex gap-2 px-6 overflow-x-auto">
          {teamsWithScores.map((t, i) => (
            <button
              type="button"
              key={t.teamId}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                i === activeIdx
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.teamName}
            </button>
          ))}
        </div>
      )}

      {teamsWithScores.length === 1 && (
        <div className="mt-3 px-6">
          <p className="text-sm font-medium text-gray-700">{team.teamName}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 px-4 sm:grid-cols-2">
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Work Values</h3>
          {team.wvScores ? (
            <SingleRadarChart
              scores={team.wvScores}
              order={WV_ORDER}
              fullLabels={WV_FULL_LABELS}
              isWV={true}
            />
          ) : (
            <div className="py-10 text-sm text-gray-400">データ準備中</div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Career Interest</h3>
          {team.ciScores ? (
            <SingleRadarChart
              scores={team.ciScores}
              order={CI_ORDER}
              fullLabels={CI_FULL_LABELS}
              isWV={false}
            />
          ) : (
            <div className="py-10 text-sm text-gray-400">データ準備中</div>
          )}
        </div>
      </div>
    </section>
  );
}
