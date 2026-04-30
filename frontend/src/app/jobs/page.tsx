"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchPublicJobPostings } from "@/features/job-posting/api";
import type { JobPostingWithCompany } from "@/features/job-posting/api";
import { Gallery } from "../companies/[id]/Gallery";

const ACCENT = "#3D8B6E";

function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}〜${max}万円`;
  if (min != null) return `${min}万円〜`;
  return `〜${max}万円`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

const JOB_CATEGORIES = ["すべて", "エンジニア", "デザイナー", "PM", "マーケティング", "営業", "その他"];
const EMPLOYMENT_TYPES = ["すべて", "正社員", "契約社員", "業務委託", "インターン", "アルバイト"];
const REMOTE_OPTIONS = ["すべて", "フルリモート", "一部リモート", "出社"];

type SortKey = "newest" | "salary";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPostingWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("すべて");
  const [employment, setEmployment] = useState("すべて");
  const [remote, setRemote] = useState("すべて");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicJobPostings()
      .then((data) => {
        if (!cancelled) {
          setJobs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = jobs;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q) ||
          j.tags.some((t) => t.toLowerCase().includes(q)) ||
          j.description.toLowerCase().includes(q),
      );
    }
    if (category !== "すべて") {
      result = result.filter((j) => j.jobCategory === category);
    }
    if (employment !== "すべて") {
      result = result.filter((j) => j.employmentType === employment);
    }
    if (remote !== "すべて") {
      result = result.filter((j) => j.remotePolicy === remote);
    }

    result = [...result].sort((a, b) => {
      if (sort === "salary") {
        return (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [jobs, search, category, employment, remote, sort]);

  const selectedJob = useMemo(
    () => (selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null),
    [jobs, selectedId],
  );

  return (
    <div className="h-screen pl-[50px] flex flex-col bg-[var(--background)]">
      {/* Filter Bar */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-[480px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="職種、キーワード、会社名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Filters */}
          <FilterSelect label="職種" value={category} onChange={setCategory} options={JOB_CATEGORIES} />
          <FilterSelect label="雇用形態" value={employment} onChange={setEmployment} options={EMPLOYMENT_TYPES} />
          <FilterSelect label="リモート" value={remote} onChange={setRemote} options={REMOTE_OPTIONS} />

          {/* Spacer + count + sort */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-500">{filtered.length}件</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="newest">新着順</option>
              <option value="salary">年収順</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Job List */}
        <div className="w-full lg:w-[440px] lg:shrink-0 border-r border-gray-200 overflow-y-auto overscroll-contain bg-[var(--background)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <p className="text-sm text-gray-500">求人の読み込みに失敗しました</p>
              <p className="mt-1 text-xs text-gray-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <EmptySearchIcon />
              <p className="mt-4 text-sm font-medium text-gray-700">該当する求人がありません</p>
              <p className="mt-1 text-xs text-gray-400">検索条件を変更してお試しください</p>
            </div>
          ) : (
            <ul>
              {filtered.map((job) => (
                <li key={job.id}>
                  <JobCard
                    job={job}
                    isSelected={selectedId === job.id}
                    onSelect={() => setSelectedId(job.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Panel - Detail (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 min-h-0 bg-gray-100">
          {selectedJob ? (
            <JobDetail job={selectedJob} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <EmptyDetailIcon />
              <p className="mt-4 text-base font-medium text-gray-700">求人を選択してください</p>
              <p className="mt-1 text-sm text-gray-400">
                左のリストから求人をクリックすると、ここに詳細が表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function isNewPosting(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
}

function JobCard({
  job,
  isSelected,
  onSelect,
}: {
  job: JobPostingWithCompany;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <>
      <Link href={`/jobs/${job.id}`} className="lg:hidden">
        <CardInner job={job} isSelected={false} />
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        <CardInner job={job} isSelected={isSelected} />
      </button>
    </>
  );
}

function CardInner({
  job,
  isSelected,
}: {
  job: JobPostingWithCompany;
  isSelected: boolean;
}) {
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
          <h3 className="flex-1 text-[15px] font-bold leading-snug text-gray-900 line-clamp-2">
            {job.title}
          </h3>
          <button
            type="button"
            className="shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <BookmarkOutlineIcon />
          </button>
        </div>

        {/* Cover image */}
        {job.coverImageUrl && (
          <div className="mt-3 overflow-hidden rounded-xl bg-gray-100">
            <img
              src={job.coverImageUrl}
              alt=""
              className="w-full aspect-[16/9] object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Status badges + Company + date */}
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {isNew && (
            <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              新着
            </span>
          )}
          <span className="shrink-0">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
            ) : (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-sm text-[8px] font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {job.companyName.charAt(0)}
              </span>
            )}
          </span>
          <span className="truncate font-medium text-gray-700">{job.companyName}</span>
          <span className="shrink-0 text-gray-400 ml-auto">{formatDate(job.createdAt)}</span>
        </div>

        {/* Meta badges (employment type, remote, category) */}
        {metaBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metaBadges.map((label) => (
              <span
                key={label}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
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
                className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Match insight */}
        <p className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: ACCENT }}>
          <SparklesIcon />
          あなたとの共通点: 責任, 創造性, 自律性
        </p>

        {/* Location + salary */}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-500">
          {job.workLocation && (
            <span className="flex items-center gap-1 truncate">
              <LocationIcon />
              <span className="truncate">{job.workLocation}</span>
            </span>
          )}
          {salary && (
            <span className="flex items-center gap-1 shrink-0 text-sm font-bold" style={{ color: ACCENT }}>
              <SalaryIcon />
              {salary}
            </span>
          )}
        </div>

        {/* Match score bar */}
        <div
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs"
          style={{ backgroundColor: `${ACCENT}0a` }}
        >
          <span>
            <span className="text-gray-500">総合 </span>
            <span className="font-bold" style={{ color: ACCENT }}>0%</span>
          </span>
          <span>
            <span className="text-gray-500">文化 </span>
            <span className="font-bold text-gray-600">0%</span>
          </span>
          <span>
            <span className="text-gray-500">適性 </span>
            <span className="font-bold text-gray-600">0%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="text-lg font-bold leading-tight text-gray-900">
        {value}
      </div>
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
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      </div>
      <dl className="flex flex-col gap-3">
        {filtered.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-gray-500">{r.label}</dt>
            <dd className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function JobDetail({ job }: { job: JobPostingWithCompany }) {
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
    { label: "年収レンジ", value: job.salaryMin != null && job.salaryMax != null ? `${job.salaryMin}万円 〜 ${job.salaryMax}万円` : "" },
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
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {/* Cover image */}
      {job.coverImageUrl && (
        <div className="w-full overflow-hidden bg-gray-100">
          <img
            src={job.coverImageUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      <div className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Company */}
          <div className="flex items-center gap-3">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {job.companyName.charAt(0)}
              </span>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{job.companyName}</p>
              {job.location && (
                <p className="text-xs text-gray-500">{job.location}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 leading-tight">
            {job.title}
          </h2>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Quick Facts */}
          {quickFacts.length > 0 && (
            <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/40 sm:grid-cols-4 sm:divide-y-0">
              {quickFacts.map((f) => (
                <DetailStatCell key={f.label} label={f.label} value={f.value!} icon={f.icon} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-6 flex items-center gap-3">
            <Link
              href={`/jobs/${job.id}`}
              className="flex-1 inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              詳細を見る
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <BookmarkOutlineIcon />
              <span className="ml-2">気になる</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      {job.galleryUrls && job.galleryUrls.length > 0 && (
        <div className="bg-white mt-2">
          <div className="max-w-3xl mx-auto px-6 py-5">
            <h3 className="text-base font-bold text-gray-900 mb-3">フォトギャラリー</h3>
          </div>
          <Gallery urls={job.galleryUrls} />
        </div>
      )}

      {/* 募集要項 */}
      <div className="bg-white mt-2">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">募集要項</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        <div className="bg-white mt-2">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">応募要件</h3>
            <div className="space-y-4">
              {job.requiredQualifications && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span
                      className="inline-flex h-5 items-center rounded px-1.5 text-xs font-bold text-white"
                      style={{ background: ACCENT }}
                    >
                      必須
                    </span>
                    必須要件
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {job.requiredQualifications}
                  </p>
                </div>
              )}
              {job.preferredQualifications && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="inline-flex h-5 items-center rounded bg-gray-400 px-1.5 text-xs font-bold text-white">
                      歓迎
                    </span>
                    歓迎要件
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {job.preferredQualifications}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SalaryIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function BookmarkOutlineIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function EmptyDetailIcon() {
  return (
    <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 7h8M8 11h5M8 15h8" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

function EmptySearchIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
      <path d="M8 8l5 5M13 8l-5 5" />
    </svg>
  );
}

function DetailYenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l7 9 7-9" /><path d="M7 13h10" /><path d="M7 17h10" /><path d="M12 13v7" />
    </svg>
  );
}

function DetailBriefcaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />
    </svg>
  );
}

function DetailUsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DetailHomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}

function DetailClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

function DetailShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}
