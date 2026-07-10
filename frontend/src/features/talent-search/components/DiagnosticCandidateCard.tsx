"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SEEKING_STATUS_MAP } from "@/constants/seeking-status";
import type { TalentCard } from "../api";
import type { DiagnosticType } from "../useTalentSearch";

export function SaveBookmark({
  saved,
  onToggle,
  size = 16,
  showLabel = false,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
  showLabel?: boolean;
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!saved) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`shrink-0 flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${
        showLabel
          ? `border px-3.5 py-2 text-xs font-medium ${
              saved
                ? "border-blue-200 bg-blue-50 text-[#2979ff]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
            }`
          : "p-1.5 rounded-md hover:bg-gray-100"
      }`}
      title={saved ? "保存を解除" : "候補者を保存"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={saved ? "#2979ff" : "none"}
        stroke={saved ? "#2979ff" : showLabel ? "currentColor" : "#9ca3af"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animating ? "animate-[bookmark-pop_0.4s_ease-out]" : ""}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {showLabel && (saved ? "保存済み" : "保存")}
      <style>{`
        @keyframes bookmark-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </button>
  );
}

function SeekingDot({ status }: { status: string }) {
  const cfg = SEEKING_STATUS_MAP[status];
  if (!cfg) return null;
  const dotColor =
    status === "active" ? "bg-emerald-400" : status === "open" ? "bg-amber-400" : "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className={`text-[13px] leading-none ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}

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

export function MatchBadges({ user: u }: { user: TalentCard }) {
  const entries: { label: string; value: number }[] = [];
  if (u.integratedSimilarity != null)
    entries.push({ label: "総合", value: u.integratedSimilarity });
  if (u.wvSimilarity != null) entries.push({ label: "文化", value: u.wvSimilarity });
  if (u.ciSimilarity != null) entries.push({ label: "適職", value: u.ciSimilarity });

  if (entries.length === 0 && u.similarity != null) {
    entries.push({ label: "総合", value: u.similarity });
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-2.5 flex items-center gap-3">
      {entries.map((e) => (
        <MatchScoreBadge key={e.label} label={e.label} value={e.value} />
      ))}
    </div>
  );
}

export function DiagnosticCandidateCard({
  user: u,
  isSelected,
  onSelect,
  diagnosticType: _diagnosticType,
  isSaved,
  onToggleSave,
}: {
  user: TalentCard;
  isSelected: boolean;
  onSelect: () => void;
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
  const recentExps = u.experiences.slice(0, 2);
  const topSkills = u.skills.slice(0, 4);
  const extraSkillCount = u.skills.length - 4;
  const wvLabels = u.topWvLabels.slice(0, 3);
  const ciLabels = u.topCiLabels.slice(0, 3);

  const inner = (
    <div
      className={`rounded-xl px-4 py-3.5 transition-all ${
        isSelected
          ? "bg-white ring-1 ring-blue-200 shadow-sm"
          : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
      }`}
    >
      {/* Row 1: Avatar + Name */}
      <div className="flex items-center gap-3.5">
        {u.avatarUrl ? (
          <Image
            src={u.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[17px] font-semibold truncate ${isSelected ? "text-gray-900" : "text-gray-800"}`}
          >
            {u.name}
          </p>
          {u.headline && <p className="text-[15px] text-gray-500 truncate mt-0.5">{u.headline}</p>}
        </div>
        {onToggleSave && <SaveBookmark saved={!!isSaved} onToggle={onToggleSave} size={16} />}
      </div>

      {/* Row 2: Match badges */}
      <MatchBadges user={u} />

      {/* Row 2: Recent experiences (up to 2) */}
      {recentExps.length > 0 && (
        <div className="mt-3 space-y-1">
          {recentExps.map((exp) => (
            <div
              key={`${exp.companyName}-${exp.title}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              <svg
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
                <span className="text-gray-700 font-medium">{exp.companyName}</span>
                <span className="text-gray-300 mx-1.5">—</span>
                <span className="text-gray-500">{exp.title}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Row 3: Skills + Status */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {topSkills.map((s) => (
          <span
            key={s}
            className="rounded-md bg-gray-100 px-2.5 py-1 text-[13px] font-medium text-gray-600 leading-none"
          >
            {s}
          </span>
        ))}
        {extraSkillCount > 0 && (
          <span className="text-[13px] text-gray-400 leading-none">+{extraSkillCount}</span>
        )}
        {u.jobSeekingStatus && topSkills.length > 0 && (
          <span className="text-gray-200 text-[13px]">|</span>
        )}
        {u.jobSeekingStatus && <SeekingDot status={u.jobSeekingStatus} />}
      </div>

      {/* Row 4: Top diagnostic labels */}
      {(wvLabels.length > 0 || ciLabels.length > 0) && (
        <div className="mt-2.5 flex items-center gap-3 min-w-0">
          {wvLabels.length > 0 && (
            <span className="text-[13px] truncate">
              <span className="text-gray-400">価値観:</span>
              <span className="text-gray-500 ml-1">{wvLabels.join("・")}</span>
            </span>
          )}
          {ciLabels.length > 0 && (
            <span className="text-[13px] truncate">
              <span className="text-gray-400">適職:</span>
              <span className="text-gray-500 ml-1">{ciLabels.join("・")}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Link href={`/profile/${u.username}`} className="lg:hidden block">
        {inner}
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        {inner}
      </button>
    </>
  );
}
