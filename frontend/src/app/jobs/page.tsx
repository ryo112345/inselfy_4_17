"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchPublicJobPostings } from "@/features/job-posting/api";
import type { JobPostingWithCompany } from "@/features/job-posting/api";

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
        <div className="w-full lg:w-[420px] lg:shrink-0 border-r border-gray-200 overflow-y-auto overscroll-contain bg-white">
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
        <div className="hidden lg:flex flex-1 overflow-y-auto overscroll-contain">
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

function JobCard({
  job,
  isSelected,
  onSelect,
}: {
  job: JobPostingWithCompany;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const visibleTags = job.tags.slice(0, 3);
  const overflowCount = job.tags.length - 3;

  return (
    <>
      {/* On mobile, clicking goes to detail page; on desktop, selects in panel */}
      <Link
        href={`/jobs/${job.id}`}
        className="lg:hidden"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <CardInner job={job} salary={salary} visibleTags={visibleTags} overflowCount={overflowCount} isSelected={false} />
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        <CardInner job={job} salary={salary} visibleTags={visibleTags} overflowCount={overflowCount} isSelected={isSelected} />
      </button>
    </>
  );
}

function CardInner({
  job,
  salary,
  visibleTags,
  overflowCount,
  isSelected,
}: {
  job: JobPostingWithCompany;
  salary: string | null;
  visibleTags: string[];
  overflowCount: number;
  isSelected: boolean;
}) {
  const badges: { label: string; className: string }[] = [];
  if (job.employmentType) badges.push({ label: job.employmentType, className: "bg-gray-100 text-gray-700" });
  if (job.remotePolicy) badges.push({ label: job.remotePolicy, className: "bg-blue-50 text-blue-700" });
  if (job.jobCategory) badges.push({ label: job.jobCategory, className: "bg-amber-50 text-amber-700" });

  return (
    <div
      className={`border-b border-gray-100 px-5 py-4 transition-colors ${
        isSelected
          ? "border-l-4 bg-[var(--accent-light)]/40"
          : "border-l-4 border-l-transparent hover:bg-gray-50"
      }`}
      style={isSelected ? { borderLeftColor: ACCENT } : undefined}
    >
      {/* Title */}
      <h3 className="text-[15px] font-bold leading-snug text-gray-900 line-clamp-2">
        {job.title}
      </h3>

      {/* Cover image */}
      {job.coverImageUrl && (
        <div className="mt-2.5 overflow-hidden rounded-lg">
          <img
            src={job.coverImageUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Company + date */}
      <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
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
        <span className="truncate font-medium text-gray-700">{job.companyName}</span>
        <span className="shrink-0">{formatDate(job.createdAt)}</span>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b.label} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.className}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Skill tags */}
      {visibleTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
            >
              {tag}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-xs text-gray-400">
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* Location + salary */}
      <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-500">
        {job.workLocation && (
          <span className="flex items-center gap-1 truncate">
            <LocationIcon />
            <span className="truncate">{job.workLocation}</span>
          </span>
        )}
        {salary && (
          <span className="flex items-center gap-1 shrink-0 font-medium text-gray-700">
            <SalaryIcon />
            {salary}
          </span>
        )}
      </div>
    </div>
  );
}

function JobDetail({ job }: { job: JobPostingWithCompany }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const descriptionPreview =
    job.description.length > 400
      ? job.description.slice(0, 400) + "..."
      : job.description;

  const facts = [
    { label: "雇用形態", value: job.employmentType },
    { label: "勤務地", value: job.workLocation },
    { label: "年収", value: salary },
    { label: "リモート", value: job.remotePolicy },
  ].filter((f) => f.value);

  return (
    <div className="flex-1 p-8 max-w-3xl mx-auto">
      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
        {job.title}
      </h2>

      {/* Company */}
      <div className="mt-4 flex items-center gap-3">
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

      {/* Key Facts */}
      {facts.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-gray-200/80 bg-gray-50 px-4 py-3"
            >
              <p className="text-xs text-gray-500">{f.label}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cover image */}
      {job.coverImageUrl && (
        <div className="mt-6 overflow-hidden rounded-xl">
          <img
            src={job.coverImageUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      {/* Description */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">仕事内容</h3>
        <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
          {descriptionPreview}
        </p>
      </div>

      {/* Appeal points */}
      {job.appealPoints && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">この仕事の魅力</h3>
          <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
            {job.appealPoints.length > 300
              ? job.appealPoints.slice(0, 300) + "..."
              : job.appealPoints}
          </p>
        </div>
      )}

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">スキル・キーワード</h3>
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 flex items-center gap-4">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          詳細を見る
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <BookmarkOutlineIcon />
          <span className="ml-2">気になる</span>
        </button>
      </div>
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

function EmptySearchIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
      <path d="M8 8l5 5M13 8l-5 5" />
    </svg>
  );
}
