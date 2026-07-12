"use client";

import Image from "next/image";
import { SEEKING_STATUS_MAP } from "@/constants/seeking-status";
import type { JobApplication } from "../api";
import { daysAgo, STATUS_COLORS, STATUS_LABELS } from "../constants";

function matchScoreColor(score: number): string {
  if (score >= 80) return "#149470";
  if (score >= 55) return "#10b77f";
  if (score >= 30) return "#8aa3d6";
  return "#cfd0cd";
}

function MatchScoreBadge({ label, value }: { label: string; value: number }) {
  const color = matchScoreColor(value);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {Math.round(value)}%
      </span>
      <div className="w-12 h-[6px] rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function AppMatchBadges({ app }: { app: JobApplication }) {
  const entries: { label: string; value: number }[] = [];
  if (app.integratedSimilarity != null)
    entries.push({ label: "総合", value: app.integratedSimilarity });
  if (app.wvSimilarity != null) entries.push({ label: "文化", value: app.wvSimilarity });
  if (app.ciSimilarity != null) entries.push({ label: "適職", value: app.ciSimilarity });
  if (entries.length === 0) return null;
  return (
    <div className="mt-2.5 flex items-center gap-3">
      {entries.map((e) => (
        <MatchScoreBadge key={e.label} label={e.label} value={e.value} />
      ))}
    </div>
  );
}

export function ApplicationCard({
  app,
  isSelected,
  onSelect,
}: {
  app: JobApplication;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const initials = app.candidateName?.charAt(0) ?? "?";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl px-4 py-3.5 transition-all cursor-pointer ${
        isSelected
          ? "bg-white ring-1 ring-blue-200 shadow-sm"
          : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
      }`}
    >
      {/* Row 1: avatar + name + status */}
      <div className="flex items-center gap-3.5">
        {app.candidateAvatar ? (
          <Image
            src={app.candidateAvatar}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
            style={{ backgroundColor: app.candidateProfileColor || "#94a3b8" }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-[17px] font-semibold truncate ${isSelected ? "text-gray-900" : "text-gray-800"}`}
            >
              {app.candidateName}
            </p>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-500"}`}
            >
              {STATUS_LABELS[app.status] ?? app.status}
            </span>
          </div>
          {app.candidateHeadline && (
            <p className="text-[15px] text-gray-500 truncate mt-0.5">{app.candidateHeadline}</p>
          )}
        </div>
      </div>

      {/* Match badges */}
      <AppMatchBadges app={app} />

      {/* Row 2: job title + elapsed time */}
      <div className="mt-3 flex items-center gap-1.5 min-w-0">
        <svg
          aria-hidden="true"
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1.5}
          className="shrink-0"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
        <p className="text-[15px] leading-snug truncate">
          <span className="text-gray-700 font-medium">{app.jobTitle}</span>
          <span className="text-gray-300 mx-1.5">·</span>
          <span className="text-gray-400">{daysAgo(app.createdAt)}</span>
        </p>
      </div>

      {/* Row 3: skills + seeking status */}
      {((app.candidateSkills && app.candidateSkills.length > 0) || app.candidateSeekingStatus) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {app.candidateSkills?.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-[13px] font-medium text-gray-600 leading-none"
            >
              {s}
            </span>
          ))}
          {(app.candidateSkills?.length ?? 0) > 4 && (
            <span className="text-[13px] text-gray-400 leading-none">
              +{(app.candidateSkills?.length ?? 0) - 4}
            </span>
          )}
          {app.candidateSeekingStatus && SEEKING_STATUS_MAP[app.candidateSeekingStatus] && (
            <>
              {(app.candidateSkills?.length ?? 0) > 0 && (
                <span className="text-gray-200 text-[13px]">|</span>
              )}
              <span className="inline-flex items-center gap-1">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${SEEKING_STATUS_MAP[app.candidateSeekingStatus].dot}`}
                />
                <span
                  className={`text-[13px] leading-none ${SEEKING_STATUS_MAP[app.candidateSeekingStatus].text}`}
                >
                  {SEEKING_STATUS_MAP[app.candidateSeekingStatus].label}
                </span>
              </span>
            </>
          )}
        </div>
      )}
    </button>
  );
}
