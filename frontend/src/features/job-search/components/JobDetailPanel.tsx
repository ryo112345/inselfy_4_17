"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gallery } from "@/app/companies/[id]/Gallery";
import { ACCENT } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
import { applyToJob, checkApplied } from "@/features/job-application/api";
import type { JobPostingWithCompany } from "@/features/job-posting/api";
import type { MatchScores } from "../match";
import { BookmarkOutlineIcon, MatchBadge, SparklesIcon } from "./MatchBadge";

function DetailStatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="text-xl font-bold leading-tight text-gray-900">{value}</div>
    </div>
  );
}

function DetailConditionGroup({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: { label: string; value: string }[];
  icon: React.ReactNode;
}) {
  const filtered = rows.filter((r) => r.value);
  if (filtered.length === 0) return null;
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5">
      <div className="mb-3 flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
        >
          {icon}
        </span>
        <h4 className="text-base font-bold text-gray-900">{title}</h4>
      </div>
      <dl className="flex flex-col gap-3">
        {filtered.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-gray-500">{r.label}</dt>
            <dd className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
      >
        {icon}
      </span>
      <h3 className="text-lg font-bold tracking-tight text-gray-900">{title}</h3>
    </div>
  );
}

function DetailYenIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4l7 9 7-9" />
      <path d="M7 13h10" />
      <path d="M7 17h10" />
      <path d="M12 13v7" />
    </svg>
  );
}

function DetailBriefcaseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function DetailUsersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DetailHomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function DetailClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function DetailShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}

function DetailCameraIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DetailDocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function DetailCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function JobDetail({
  job,
  matchScores,
  onScroll,
}: {
  job: JobPostingWithCompany;
  matchScores: MatchScores | null;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    checkApplied(job.id).then(setApplied);
  }, [isAuthenticated, user, job.id]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/jobs/${job.id}`);
      return;
    }
    if (applied || applying) return;
    setApplying(true);
    try {
      await applyToJob(job.id);
      setApplied(true);
    } catch {
      // already applied is also fine
      setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  const quickFacts = [
    {
      label: "想定年収",
      value:
        job.salaryMin != null || job.salaryMax != null ? (
          <span>
            {job.salaryMin != null && job.salaryMax != null
              ? `${job.salaryMin}〜${job.salaryMax}`
              : job.salaryMin != null
                ? `${job.salaryMin}〜`
                : `〜${job.salaryMax}`}
            <span className="ml-0.5 text-xs font-medium text-gray-500">万円</span>
          </span>
        ) : null,
      icon: <DetailYenIcon />,
    },
    { label: "雇用形態", value: job.employmentType || null, icon: <DetailBriefcaseIcon /> },
    { label: "採用人数", value: job.hiringCount || null, icon: <DetailUsersIcon /> },
    { label: "勤務形態", value: job.remotePolicy || null, icon: <DetailHomeIcon /> },
  ].filter((f) => f.value != null);

  const workConditions = [
    { label: "勤務地", value: job.workLocation },
    { label: "勤務時間", value: job.workHours },
    { label: "休憩時間", value: job.breakTime },
    { label: "休日・休暇", value: job.holidays },
  ];
  const compensationConditions = [
    {
      label: "年収レンジ",
      value:
        job.salaryMin != null && job.salaryMax != null
          ? `${job.salaryMin}万円 〜 ${job.salaryMax}万円`
          : "",
    },
    { label: "給与詳細", value: job.salaryDetail },
    { label: "社会保険", value: job.insurance },
  ];
  const contractConditions = [
    { label: "契約期間", value: job.contractType },
    { label: "試用期間", value: job.probationPeriod },
    { label: "就業場所の変更範囲", value: job.workLocationChangeScope },
    { label: "業務内容の変更範囲", value: job.jobDescriptionChangeScope },
  ];

  return (
    <div onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain bg-white">
      {/* Cover image with gradient fade */}
      {job.coverImageUrl && (
        <div className="relative w-full overflow-hidden bg-gray-100">
          <Image
            src={job.coverImageUrl}
            alt=""
            width={1600}
            height={900}
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-7">
        {/* Company */}
        <div className="flex items-center gap-3 mt-6">
          <div className="relative h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
            {job.companyLogoUrl ? (
              <Image src={job.companyLogoUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: ACCENT }}>
                {job.companyName.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{job.companyName}</p>
            {job.location && <p className="text-sm text-gray-500">{job.location}</p>}
          </div>
        </div>

        {/* Title */}
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 leading-snug">
          {job.title}
        </h2>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Match Scores */}
        {matchScores && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-3">
              <MatchBadge label="総合" value={matchScores.overall} />
              <MatchBadge label="文化" value={matchScores.culture} />
              <MatchBadge label="適職" value={matchScores.aptitude} />
            </div>
            {matchScores.commonPoints.length > 0 && (
              <div className="flex items-center gap-1" style={{ color: ACCENT }}>
                <SparklesIcon />
                <span className="font-medium">共通点:</span>
                <span>{matchScores.commonPoints.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Facts */}
        {quickFacts.length > 0 && (
          <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50/60 sm:grid-cols-4 sm:divide-y-0">
            {quickFacts.map((f) => (
              <DetailStatCell key={f.label} label={f.label} value={f.value} icon={f.icon} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={applied || applying}
            className="flex-1 inline-flex items-center justify-center rounded-xl py-3.5 text-base font-bold text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
            style={{ backgroundColor: applied ? "#9CA3AF" : ACCENT }}
          >
            {applying ? "送信中..." : applied ? "応募済み" : "応募する"}
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white py-3.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            詳細を見る
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <BookmarkOutlineIcon />
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      {job.galleryUrls && job.galleryUrls.length > 0 && (
        <div className="mt-8 max-w-4xl mx-auto px-7">
          <DetailSectionHeader icon={<DetailCameraIcon />} title="フォトギャラリー" />
          <div className="mt-3 overflow-hidden rounded-xl">
            <Gallery urls={job.galleryUrls} />
          </div>
        </div>
      )}

      {/* 仕事内容 */}
      {job.description && (
        <div className="mt-8 max-w-4xl mx-auto px-7">
          <DetailSectionHeader icon={<DetailDocumentIcon />} title="仕事内容" />
          <div className="mt-4 rounded-xl border border-gray-200/80 bg-white p-5">
            <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
              {job.description}
            </p>
          </div>
        </div>
      )}

      {/* 募集要項 */}
      <div className="mt-8">
        <div className="max-w-4xl mx-auto px-7">
          <DetailSectionHeader icon={<DetailDocumentIcon />} title="募集要項" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <DetailConditionGroup
              title="勤務情報"
              rows={workConditions}
              icon={<DetailClockIcon />}
            />
            <DetailConditionGroup
              title="給与・報酬"
              rows={compensationConditions}
              icon={<DetailYenIcon />}
            />
            <DetailConditionGroup
              title="契約・その他"
              rows={contractConditions}
              icon={<DetailShieldIcon />}
            />
          </div>
        </div>
      </div>

      {/* 応募要件 */}
      {(job.requiredQualifications || job.preferredQualifications) && (
        <div className="mt-8">
          <div className="max-w-4xl mx-auto px-7">
            <DetailSectionHeader icon={<DetailCheckIcon />} title="応募要件" />
            <div className="mt-4 space-y-5">
              {job.requiredQualifications && (
                <div className="rounded-xl border border-gray-200/80 bg-white p-5">
                  <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <span
                      className="inline-flex h-5 items-center rounded px-1.5 text-xs font-bold text-white"
                      style={{ background: ACCENT }}
                    >
                      必須
                    </span>
                    必須要件
                  </h4>
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {job.requiredQualifications}
                  </p>
                </div>
              )}
              {job.preferredQualifications && (
                <div className="rounded-xl border border-gray-200/80 bg-white p-5">
                  <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <span className="inline-flex h-5 items-center rounded bg-gray-400 px-1.5 text-xs font-bold text-white">
                      歓迎
                    </span>
                    歓迎要件
                  </h4>
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {job.preferredQualifications}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-10" />
    </div>
  );
}
