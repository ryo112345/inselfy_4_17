"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACCENT } from "@/constants/theme";
import type { JobPostingWithCompany } from "@/features/job-posting/api";
import { formatRelativeDate } from "@/lib/date";
import { formatSalary, type MatchScores } from "../match";
import { BookmarkOutlineIcon, MatchBadge, SparklesIcon } from "./MatchBadge";

function isNewPosting(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SalaryIcon() {
  return (
    <svg
      aria-hidden="true"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

export function JobCard({
  job,
  isSelected,
  onSelect,
  hasDiagnosis,
  matchScores,
}: {
  job: JobPostingWithCompany;
  isSelected: boolean;
  onSelect: () => void;
  hasDiagnosis: boolean;
  matchScores: MatchScores | null;
}) {
  return (
    <>
      <Link href={`/jobs/${job.id}`} className="lg:hidden">
        <CardInner
          job={job}
          isSelected={false}
          hasDiagnosis={hasDiagnosis}
          matchScores={matchScores}
        />
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        <CardInner
          job={job}
          isSelected={isSelected}
          hasDiagnosis={hasDiagnosis}
          matchScores={matchScores}
        />
      </button>
    </>
  );
}

function CardInner({
  job,
  isSelected,
  hasDiagnosis,
  matchScores,
}: {
  job: JobPostingWithCompany;
  isSelected: boolean;
  hasDiagnosis: boolean;
  matchScores: MatchScores | null;
}) {
  const router = useRouter();
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const isNew = isNewPosting(job.createdAt);

  const metaBadges: string[] = [];
  if (job.employmentType) metaBadges.push(job.employmentType);
  if (job.remotePolicy) metaBadges.push(job.remotePolicy);
  if (job.jobCategory) metaBadges.push(job.jobCategory);

  return (
    <div className={`px-4 py-3 ${isSelected ? "" : ""}`}>
      <div
        className={`rounded-2xl border bg-white p-4 transition-shadow ${
          isSelected
            ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent),0_4px_12px_-4px_rgba(61,139,110,0.15)]"
            : "border-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.06)] hover:shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_20px_-8px_rgba(16,24,40,0.1)]"
        }`}
      >
        {/* Title + Bookmark */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-base font-bold leading-snug text-gray-900 line-clamp-2">
            {job.title}
          </h3>
          {/* biome-ignore lint/a11y/useSemanticElements: カード全体が button/Link でラップされるため button をネストできない */}
          <div
            role="button"
            tabIndex={0}
            aria-label="求人を保存"
            className="shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.stopPropagation();
            }}
          >
            <BookmarkOutlineIcon />
          </div>
        </div>

        {/* Cover image */}
        {job.coverImageUrl && (
          <div className="-mx-4 mt-3 overflow-hidden bg-gray-100">
            <Image
              src={job.coverImageUrl}
              alt=""
              width={1600}
              height={900}
              sizes="(max-width: 1024px) 100vw, 440px"
              className="w-full aspect-[16/9] object-cover"
            />
          </div>
        )}

        {/* Status badges + Company + date */}
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          {isNew && (
            <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-xs font-bold text-white leading-none">
              新着
            </span>
          )}
          <span className="shrink-0">
            {job.companyLogoUrl ? (
              <Image
                src={job.companyLogoUrl}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-sm object-cover"
              />
            ) : (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-sm text-[9px] font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {job.companyName.charAt(0)}
              </span>
            )}
          </span>
          <span className="truncate font-medium text-gray-700">{job.companyName}</span>
          <span className="shrink-0 text-gray-400 ml-auto">
            {formatRelativeDate(job.createdAt)}
          </span>
        </div>

        {/* Meta badges (employment type, remote, category) */}
        {metaBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metaBadges.map((label) => (
              <span
                key={label}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-sm text-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Skill tags (all visible) */}
        {job.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-sm text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Location + salary */}
        <div className="mt-2.5 flex items-center gap-3 text-sm text-gray-500">
          {job.workLocation && (
            <span className="flex items-center gap-1 truncate">
              <LocationIcon />
              <span className="truncate">{job.workLocation}</span>
            </span>
          )}
          {salary && (
            <span
              className="flex items-center gap-1 shrink-0 text-base font-bold"
              style={{ color: ACCENT }}
            >
              <SalaryIcon />
              {salary}
            </span>
          )}
        </div>

        {/* Diagnosis CTA or match score */}
        {hasDiagnosis && matchScores ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <MatchBadge label="総合" value={matchScores.overall} />
              <MatchBadge label="文化" value={matchScores.culture} />
              <MatchBadge label="適職" value={matchScores.aptitude} />
            </div>
            {matchScores.commonPoints.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1 text-sm" style={{ color: ACCENT }}>
                <SparklesIcon />
                <span className="font-medium">あなたとの共通点:</span>
                <span>{matchScores.commonPoints.join(", ")}</span>
              </div>
            )}
          </div>
        ) : hasDiagnosis ? (
          <div
            className="mt-3 flex items-center gap-1 text-sm font-medium"
            style={{ color: ACCENT }}
          >
            <SparklesIcon />
            マッチ度を確認できます
          </div>
        ) : (
          // biome-ignore lint/a11y/useSemanticElements: カード全体が button/Link でラップされるため a をネストできない
          <div
            role="link"
            tabIndex={0}
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
            style={{ backgroundColor: `${ACCENT}0a` }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              router.push("/work_values/start");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                router.push("/work_values/start");
              }
            }}
          >
            <SparklesIcon />
            <span className="text-gray-600">診断を受けると</span>
            <span className="font-semibold" style={{ color: ACCENT }}>
              マッチ度
            </span>
            <span className="text-gray-600">がわかります</span>
          </div>
        )}
      </div>
    </div>
  );
}
