"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
import { JobSeekingBadge } from "@/components/ui";
import type { TalentCard } from "../api";
import type { DiagnosticType } from "../useTalentSearch";
import { MatchBadges, SaveBookmark } from "./DiagnosticCandidateCard";

function formatPeriod(
  startYear: number,
  startMonth: number,
  endYear?: number | null,
  endMonth?: number | null,
  isCurrent?: boolean,
) {
  const start = `${startYear}年${startMonth}月`;
  if (isCurrent) return `${start} — 現在`;
  if (endYear && endMonth) return `${start} — ${endYear}年${endMonth}月`;
  return start;
}

export function CandidateDetail({
  user: u,
  wvScores,
  ciScores,
  loading,
  compareWv,
  compareCi,
  compareLabel,
  allExperiences,
  allSkills,
  about,
  diagnosticType: _diagnosticType,
  isSaved,
  onToggleSave,
}: {
  user: TalentCard;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
  loading: boolean;
  compareWv?: { id: string; score: number }[] | null;
  compareCi?: { id: string; score: number }[] | null;
  compareLabel?: string;
  allExperiences: {
    companyName: string;
    title: string;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
    isCurrent: boolean;
    description?: string;
  }[];
  allSkills: string[];
  about: string | null;
  diagnosticType: DiagnosticType;
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const initials = u.name
    .split(/\s/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  const avatarBg = u.profileColor ?? "#94a3b8";

  const experiences =
    allExperiences.length > 0
      ? allExperiences
      : u.experiences.map((e) => ({
          companyName: e.companyName,
          title: e.title,
          startYear: 0,
          startMonth: 0,
          endYear: null as number | null,
          endMonth: null as number | null,
          isCurrent: false,
          description: undefined as string | undefined,
        }));
  const skillList = allSkills.length > 0 ? allSkills : u.skills;

  const [aboutExpanded, setAboutExpanded] = useState(false);
  const aboutNeedsExpand = about ? about.length > 200 : false;

  return (
    <div className="flex-1 p-8 space-y-0">
      {/* ── Header ── */}
      <div className="flex items-start gap-4 pb-6">
        {u.avatarUrl ? (
          <Image
            src={u.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">{u.name}</h2>
            <JobSeekingBadge status={u.jobSeekingStatus} />
          </div>
          {u.headline && <p className="text-sm text-gray-500 mt-1">{u.headline}</p>}
          <div className="flex items-center gap-1.5 mt-2.5">
            <MatchBadges user={u} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleSave && (
            <SaveBookmark saved={!!isSaved} onToggle={onToggleSave} size={14} showLabel />
          )}
          <Link
            href={`/company/scout/send?userId=${u.userId}&username=${u.username}`}
            className="rounded-lg border border-[#2979ff] bg-[#2979ff] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            スカウトを送る
          </Link>
          <Link
            href={`/profile/${u.username}`}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            プロフィール →
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── About ── */}
      {about && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            自己紹介
          </h3>
          <p
            className={`text-sm text-gray-600 whitespace-pre-line leading-relaxed ${!aboutExpanded && aboutNeedsExpand ? "line-clamp-3" : ""}`}
          >
            {about}
          </p>
          {aboutNeedsExpand && (
            <button
              type="button"
              onClick={() => setAboutExpanded(!aboutExpanded)}
              className="text-xs text-blue-500 hover:text-blue-600 mt-1 cursor-pointer"
            >
              {aboutExpanded ? "閉じる" : "もっと見る"}
            </button>
          )}
        </div>
      )}

      {about && <div className="border-t border-gray-100" />}

      {/* ── Experiences ── */}
      {experiences.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            職歴
          </h3>
          <div className="space-y-0">
            {experiences.map((exp, i) => (
              <div key={i} className="flex gap-3 group">
                <div className="flex flex-col items-center w-4 shrink-0">
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${
                      exp.isCurrent
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 bg-white group-hover:border-gray-400"
                    }`}
                  />
                  {i < experiences.length - 1 && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-gray-900">{exp.title}</p>
                    {exp.isCurrent && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 leading-none">
                        現職
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{exp.companyName}</p>
                  {exp.startYear > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPeriod(
                        exp.startYear,
                        exp.startMonth,
                        exp.endYear,
                        exp.endMonth,
                        exp.isCurrent,
                      )}
                    </p>
                  )}
                  {exp.description && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                      {exp.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {experiences.length > 0 && <div className="border-t border-gray-100" />}

      {/* ── Skills ── */}
      {skillList.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            スキル
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skillList.map((s) => (
              <span
                key={s}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {skillList.length > 0 && <div className="border-t border-gray-100" />}

      {/* ── Diagnostic Charts ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            診断結果
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-700">価値観（Work Values）</h4>
                {u.wvSimilarity != null && (
                  <span className="text-xs text-gray-400">{Math.round(u.wvSimilarity)}% match</span>
                )}
              </div>
              {wvScores ? (
                <SingleRadarChart
                  scores={wvScores}
                  order={WV_ORDER}
                  fullLabels={WV_FULL_LABELS}
                  isWV={true}
                  compareScores={compareWv}
                  compareLabel={compareLabel}
                />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  未受験
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-700">適職（Career Interest）</h4>
                {u.ciSimilarity != null && (
                  <span className="text-xs text-gray-400">{Math.round(u.ciSimilarity)}% match</span>
                )}
              </div>
              {ciScores ? (
                <SingleRadarChart
                  scores={ciScores}
                  order={CI_ORDER}
                  fullLabels={CI_FULL_LABELS}
                  isWV={false}
                  compareScores={compareCi}
                  compareLabel={compareLabel}
                />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  未受験
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
