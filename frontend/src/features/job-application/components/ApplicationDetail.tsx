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
import { SEEKING_STATUS_MAP } from "@/constants/seeking-status";
import type { CandidateDetail } from "@/features/talent-search/api";
import type { JobApplication, JobApplicationStatus } from "../api";
import { daysAgo, STATUS_COLORS, STATUS_LABELS, STATUS_OPTIONS } from "../constants";
import { AppMatchBadges } from "./ApplicationCard";

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

function AboutSection({ about }: { about: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = about.length > 200;

  return (
    <div className="py-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        自己紹介
      </h3>
      <p
        className={`text-sm text-gray-600 whitespace-pre-line leading-relaxed ${!expanded && needsExpand ? "line-clamp-3" : ""}`}
      >
        {about}
      </p>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-600 mt-1 cursor-pointer"
        >
          {expanded ? "閉じる" : "もっと見る"}
        </button>
      )}
    </div>
  );
}

export function ApplicationDetail({
  selected,
  detail,
  detailLoading,
  pendingProposal,
  teamWvAvg,
  teamCiAvg,
  teamName,
  onStatusChange,
}: {
  selected: JobApplication;
  detail: CandidateDetail | null;
  detailLoading: boolean;
  pendingProposal: { hasPending: boolean; createdAt?: string } | null;
  teamWvAvg: { id: string; score: number }[] | null;
  teamCiAvg: { id: string; score: number }[] | null;
  teamName: string;
  onStatusChange: (applicationId: string, newStatus: JobApplicationStatus) => void;
}) {
  return (
    <div className="flex-1 p-8 space-y-0">
      {/* ── Header ── */}
      <div className="flex items-start gap-4 pb-6">
        {selected.candidateAvatar ? (
          <Image
            src={selected.candidateAvatar}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 ring-2 ring-white shadow-sm"
            style={{
              backgroundColor: detail?.profileColor ?? "#94a3b8",
            }}
          >
            {selected.candidateName?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">
              {selected.candidateName}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-500"}`}
            >
              {STATUS_LABELS[selected.status] ?? selected.status}
            </span>
            {detail?.jobSeekingStatus && SEEKING_STATUS_MAP[detail.jobSeekingStatus] && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].bg} ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].text}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].dot}`}
                />
                {SEEKING_STATUS_MAP[detail.jobSeekingStatus].label}
              </span>
            )}
          </div>
          {selected.candidateHeadline && (
            <p className="text-sm text-gray-500 mt-1">{selected.candidateHeadline}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2.5">
            <AppMatchBadges app={selected} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            応募日: {new Date(selected.createdAt).toLocaleDateString("ja-JP")} (
            {daysAgo(selected.createdAt)})
          </p>
        </div>
        {selected.candidateUsername && (
          <Link
            href={`/profile/${selected.candidateUsername}`}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            プロフィール →
          </Link>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-2 pb-6">
        <Link
          href={`/company/messages?candidateId=${selected.candidateId}&candidateName=${encodeURIComponent(selected.candidateName ?? "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
          メッセージを送る
        </Link>
        <Link
          href={`/company/calendar/propose?applicationId=${selected.id}&candidateName=${encodeURIComponent(selected.candidateName ?? "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {pendingProposal?.hasPending ? "日程を再提案" : "日程を提案"}
        </Link>
        {pendingProposal?.hasPending && (
          <span className="text-xs text-amber-600">提案済み・回答待ち</span>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Status control ── */}
      <div className="py-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          ステータス変更
        </h3>
        {selected.status === "withdrawn" ? (
          <p className="text-sm text-gray-400">候補者が辞退しました</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => {
              const isCurrent = selected.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) onStatusChange(selected.id, opt.value);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isCurrent
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Applied job ── */}
      <div className="py-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          応募求人
        </h3>
        <Link
          href={`/company/jobs/${selected.jobPostingId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          {selected.jobTitle}
        </Link>
      </div>

      {/* ── Application message ── */}
      {selected.message && (
        <>
          <div className="border-t border-gray-100" />
          <div className="py-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              応募メッセージ
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {selected.message}
            </p>
          </div>
        </>
      )}

      <div className="border-t border-gray-100" />

      {/* ── Candidate details ── */}
      {detailLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : detail ? (
        <>
          {/* About */}
          {detail.about && (
            <>
              <AboutSection about={detail.about} />
              <div className="border-t border-gray-100" />
            </>
          )}

          {/* Experiences */}
          {detail.experiences.length > 0 && (
            <>
              <div className="py-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  職歴
                </h3>
                <div className="space-y-0">
                  {detail.experiences.map((exp, i) => (
                    <div
                      key={`${exp.companyName}-${exp.title}-${exp.startYear}-${exp.startMonth}`}
                      className="flex gap-3 group"
                    >
                      <div className="flex flex-col items-center w-4 shrink-0">
                        <div
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${
                            exp.isCurrent
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300 bg-white group-hover:border-gray-400"
                          }`}
                        />
                        {i < detail.experiences.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 my-0.5" />
                        )}
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
              <div className="border-t border-gray-100" />
            </>
          )}

          {/* Skills */}
          {detail.skills.length > 0 && (
            <>
              <div className="py-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                  スキル
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100" />
            </>
          )}

          {/* Diagnostic Charts */}
          <div className="py-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              診断結果
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-150 bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-700">価値観（Work Values）</h4>
                  {selected.wvSimilarity != null && (
                    <span className="text-xs text-gray-400">
                      {Math.round(selected.wvSimilarity)}% match
                    </span>
                  )}
                </div>
                {detail.wvScores ? (
                  <SingleRadarChart
                    scores={detail.wvScores}
                    order={WV_ORDER}
                    fullLabels={WV_FULL_LABELS}
                    isWV={true}
                    compareScores={teamWvAvg}
                    compareLabel={teamName}
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
                  {selected.ciSimilarity != null && (
                    <span className="text-xs text-gray-400">
                      {Math.round(selected.ciSimilarity)}% match
                    </span>
                  )}
                </div>
                {detail.ciScores ? (
                  <SingleRadarChart
                    scores={detail.ciScores}
                    order={CI_ORDER}
                    fullLabels={CI_FULL_LABELS}
                    isWV={false}
                    compareScores={teamCiAvg}
                    compareLabel={teamName}
                  />
                ) : (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                    未受験
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
