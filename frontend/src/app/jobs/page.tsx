"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchPublicJobPostings } from "@/features/job-posting/api";
import type { JobPostingWithCompany } from "@/features/job-posting/api";
import { Gallery } from "../companies/[id]/Gallery";
import { useAuth } from "@/features/auth/auth-context";
import { getLatestResult as getLatestWvResult } from "@/features/work-values/api";
import type { ResultDTO as WvResultDTO } from "@/features/work-values/api";
import { VALUE_NEEDS } from "@/features/work-values/lib/needs";
import type { ValueId } from "@/features/work-values/lib/needs";
import { getLatestResult as getLatestCiResult } from "@/features/career-interest/api";
import type { ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import { ValuesFilterDrawer } from "@/features/work-values/ValuesFilterDrawer";
import type { FilterMode } from "@/features/work-values/ValuesFilterDrawer";
import { applyToJob, checkApplied } from "@/features/job-application/api";
import {
  fetchPublicTeamScores,
  type PublicTeamScore as TeamScores,
} from "@/features/company-profile/api";

const ACCENT = "#3D8B6E";

const WV_ORDER = ["achievement", "status", "autonomy", "safety", "altruism", "comfort"];
const CI_ORDER = ["R", "I", "A", "S", "E", "C"];

type MatchScores = { overall: number; culture: number; aptitude: number; commonPoints: string[] };

const SIGMA_WV = 18;
const SIGMA_CI = 0.7;
const GEOMEAN_FLOOR = 0.001;
function gauss(diff: number, sigma: number) {
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

function computeMatchScores(
  userWv: WvResultDTO | null,
  userCi: CiResultDTO | null,
  teamScores: TeamScores | undefined,
): MatchScores | null {
  if (!teamScores) return null;

  let culture: number | null = null;
  let aptitude: number | null = null;

  if (userWv && teamScores.wvScores && teamScores.wvScores.length > 0) {
    const userMap = new Map(userWv.values.map((v) => [v.valueId, v.displayScore]));
    const teamMap = new Map(teamScores.wvScores.map((s) => [s.id, s.score]));
    let logSum = 0;
    let weightTotal = 0;
    for (const id of WV_ORDER) {
      const u = userMap.get(id);
      const t = teamMap.get(id);
      if (u != null && t != null) {
        const closeness = gauss(Math.abs(u - t), SIGMA_WV);
        logSum += u * Math.log(closeness + GEOMEAN_FLOOR);
        weightTotal += u;
      }
    }
    if (weightTotal > 0) culture = Math.round(Math.exp(logSum / weightTotal) * 100);
  }

  if (userCi && teamScores.ciScores && teamScores.ciScores.length > 0) {
    const userMap = new Map(userCi.typeScores.map((s) => [s.typeId, s.score]));
    const teamMap = new Map(teamScores.ciScores.map((s) => [s.id, s.score]));
    let logSum = 0;
    let count = 0;
    for (const id of CI_ORDER) {
      const u = userMap.get(id);
      const t = teamMap.get(id);
      if (u != null && t != null) {
        logSum += Math.log(gauss(Math.abs(u - t), SIGMA_CI) + GEOMEAN_FLOOR);
        count++;
      }
    }
    if (count > 0) aptitude = Math.round(Math.exp(logSum / count) * 100);
  }

  if (culture == null && aptitude == null) return null;

  const overall =
    culture != null && aptitude != null
      ? Math.round((culture + aptitude) / 2)
      : culture ?? aptitude!;

  let commonPoints: string[] = [];
  if (userWv && teamScores.wvScores && teamScores.wvScores.length > 0) {
    const teamMap = new Map(teamScores.wvScores.map((s) => [s.id, s.score]));
    const highValueIds = WV_ORDER.filter((id) => (teamMap.get(id) ?? 0) >= 50) as ValueId[];
    const highNeedIds = new Set(highValueIds.flatMap((vid) => VALUE_NEEDS[vid] ?? []));
    const needLabelMap = new Map(userWv.needs.map((n) => [n.needId, n.label]));
    commonPoints = userWv.needs
      .filter((n) => n.displayScore >= 55 && highNeedIds.has(n.needId as any))
      .sort((a, b) => b.displayScore - a.displayScore)
      .slice(0, 3)
      .map((n) => needLabelMap.get(n.needId) ?? n.needId);
  }

  return { overall, culture: culture ?? overall, aptitude: aptitude ?? overall, commonPoints };
}

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
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPostingWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean | null>(null);
  const [userWv, setUserWv] = useState<WvResultDTO | null>(null);
  const [userCi, setUserCi] = useState<CiResultDTO | null>(null);
  const [teamScoresMap, setTeamScoresMap] = useState<Map<string, TeamScores>>(new Map());

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("すべて");
  const [employment, setEmployment] = useState("すべて");
  const [remote, setRemote] = useState("すべて");
  const [sort, setSort] = useState<SortKey>("newest");
  const [valuesFilterOpen, setValuesFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("values");
  const [valueThresholds, setValueThresholds] = useState<Record<string, number>>({});
  const [needThresholds, setNeedThresholds] = useState<Record<string, number>>({});

  const [filterBarVisible, setFilterBarVisible] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastScrollLeftRef = useRef(0);
  const lastScrollRightRef = useRef(0);
  const toggleCooldownRef = useRef(0);
  const [filterHeight, setFilterHeight] = useState(0);

  useEffect(() => {
    const el = filterRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFilterHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const makeScrollHandler = useCallback(
    (lastRef: React.MutableRefObject<number>) =>
      (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const now = Date.now();
        if (now - toggleCooldownRef.current < 400) {
          lastRef.current = scrollTop;
          return;
        }
        const delta = scrollTop - lastRef.current;
        if (delta > 8) {
          setFilterBarVisible(false);
          toggleCooldownRef.current = now;
        } else if (delta < -8) {
          setFilterBarVisible(true);
          toggleCooldownRef.current = now;
        }
        lastRef.current = scrollTop;
      },
    [],
  );

  const handleLeftScroll = useMemo(() => makeScrollHandler(lastScrollLeftRef), [makeScrollHandler]);
  const handleRightScroll = useMemo(() => makeScrollHandler(lastScrollRightRef), [makeScrollHandler]);

  useEffect(() => {
    if (user) {
      Promise.all([
        getLatestWvResult(user.id).catch(() => null),
        getLatestCiResult(user.id).catch(() => null),
      ]).then(([wv, ci]) => {
        setUserWv(wv);
        setUserCi(ci);
        setHasDiagnosis(wv !== null || ci !== null);
      });
    } else {
      setHasDiagnosis(false);
    }
  }, [user]);

  const valueFiltersParam = useMemo(() => {
    const src = filterMode === "values" ? valueThresholds : needThresholds;
    const pairs = Object.entries(src).filter(([, v]) => v > 0);
    if (pairs.length === 0) return "";
    return pairs.map(([id, score]) => `${id}:${score}`).join(",");
  }, [filterMode, valueThresholds, needThresholds]);

  const fetchJobs = useCallback(async (reset: boolean, currentOffset: number) => {
    if (!reset && fetchingRef.current) return;
    fetchingRef.current = true;
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await searchPublicJobPostings({
        search: search.trim() || undefined,
        category: category !== "すべて" ? category : undefined,
        employmentType: employment !== "すべて" ? employment : undefined,
        remotePolicy: remote !== "すべて" ? remote : undefined,
        sort,
        limit: PAGE_SIZE,
        offset: currentOffset,
        valueFilters: valueFiltersParam || undefined,
        filterMode: valueFiltersParam ? filterMode : undefined,
      });
      if (reset) {
        setJobs(data.items);
      } else {
        setJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const newItems = data.items.filter((j) => !existingIds.has(j.id));
          return [...prev, ...newItems];
        });
      }
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [search, category, employment, remote, sort, valueFiltersParam, filterMode]);

  useEffect(() => {
    const needsDebounce = search.trim() || valueFiltersParam;
    const timeout = setTimeout(() => {
      fetchJobs(true, 0);
    }, needsDebounce ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchJobs]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const hasMore = jobs.length < total;
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          fetchJobs(false, jobs.length);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [jobs.length, total, loadingMore, fetchJobs]);

  useEffect(() => {
    if (!hasDiagnosis || jobs.length === 0) return;
    const companyIds = [...new Set(jobs.map((j) => j.companyId))];
    Promise.all(companyIds.map((id) => fetchPublicTeamScores(id))).then((results) => {
      const map = new Map<string, TeamScores>();
      results.flat().forEach((t) => map.set(t.teamId, t));
      setTeamScoresMap(map);
    });
  }, [hasDiagnosis, jobs]);

  const matchScoresMap = useMemo(() => {
    if (!hasDiagnosis || teamScoresMap.size === 0) return new Map<string, MatchScores>();
    const map = new Map<string, MatchScores>();
    for (const job of jobs) {
      if (!job.teamId) continue;
      const team = teamScoresMap.get(job.teamId);
      const scores = computeMatchScores(userWv, userCi, team);
      if (scores) map.set(job.id, scores);
    }
    return map;
  }, [hasDiagnosis, jobs, teamScoresMap, userWv, userCi]);

  const activeFilterCount = useMemo(() => {
    const src = filterMode === "values" ? valueThresholds : needThresholds;
    return Object.values(src).filter((v) => v > 0).length;
  }, [filterMode, valueThresholds, needThresholds]);

  useEffect(() => {
    if (jobs.length > 0 && (!selectedId || !jobs.some((j) => j.id === selectedId))) {
      setSelectedId(jobs[0].id);
    }
  }, [jobs]);

  const selectedJob = useMemo(
    () => (selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null),
    [jobs, selectedId],
  );

  return (
    <div className="h-screen md:pl-[50px] flex flex-col bg-[var(--background)] overflow-hidden">
      {/* Filter Bar */}
      <div
        ref={filterRef}
        className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 md:px-6 md:py-3 transition-[transform,margin-bottom] duration-300 ease-in-out will-change-transform"
        style={{
          transform: filterBarVisible ? 'none' : 'translateY(-100%)',
          marginBottom: filterBarVisible ? 0 : -filterHeight,
        }}
      >
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-0 md:min-w-[240px] md:max-w-[480px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="職種、キーワード、会社名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Spacer + count + sort (desktop) */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-500">{total}件</span>
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

        {/* Filter row */}
        <div className="flex items-center gap-2 md:gap-3 mt-2 overflow-x-auto">
          <FilterSelect label="職種" value={category} onChange={setCategory} options={JOB_CATEGORIES} />
          <FilterSelect label="雇用形態" value={employment} onChange={setEmployment} options={EMPLOYMENT_TYPES} />
          <FilterSelect label="リモート" value={remote} onChange={setRemote} options={REMOTE_OPTIONS} />

          {/* Values Filter Button */}
          {hasDiagnosis && (
            <button
              type="button"
              onClick={() => setValuesFilterOpen(true)}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer"
              style={
                activeFilterCount > 0
                  ? { borderColor: ACCENT, color: ACCENT, backgroundColor: `${ACCENT}08` }
                  : { borderColor: "#e5e7eb", color: "#374151" }
              }
            >
              <ValuesFilterIcon />
              価値観
              {activeFilterCount > 0 && (
                <span
                  className="ml-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
            <span className="text-xs text-gray-500">{total}件</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none cursor-pointer"
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
        <div ref={listRef} onScroll={handleLeftScroll} className="w-full lg:w-[440px] lg:shrink-0 border-r border-gray-200 overflow-y-auto overscroll-contain bg-[var(--background)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <p className="text-sm text-gray-500">求人の読み込みに失敗しました</p>
              <p className="mt-1 text-xs text-gray-400">{error}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <EmptySearchIcon />
              <p className="mt-4 text-sm font-medium text-gray-700">該当する求人がありません</p>
              <p className="mt-1 text-xs text-gray-400">検索条件を変更してお試しください</p>
            </div>
          ) : (
            <>
              <ul>
                {jobs.map((job) => (
                  <li key={job.id}>
                    <JobCard
                      job={job}
                      isSelected={selectedId === job.id}
                      onSelect={() => setSelectedId(job.id)}
                      hasDiagnosis={hasDiagnosis === true}
                      matchScores={matchScoresMap.get(job.id) ?? null}
                    />
                  </li>
                ))}
              </ul>
              {jobs.length < total && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore && (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel - Detail (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 min-h-0 bg-gray-100">
          {selectedJob ? (
            <JobDetail job={selectedJob} matchScores={selectedJob ? matchScoresMap.get(selectedJob.id) ?? null : null} onScroll={handleRightScroll} />
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

      <ValuesFilterDrawer
        open={valuesFilterOpen}
        onClose={() => setValuesFilterOpen(false)}
        userNeeds={userWv?.needs ?? null}
        userValues={userWv?.values ?? null}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        thresholds={filterMode === "values" ? valueThresholds : needThresholds}
        onThresholdsChange={filterMode === "values" ? setValueThresholds : setNeedThresholds}
        matchingCount={total}
      />
    </div>
  );
}

function ValuesFilterIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
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
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none cursor-pointer"
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
        <CardInner job={job} isSelected={false} hasDiagnosis={hasDiagnosis} matchScores={matchScores} />
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        <CardInner job={job} isSelected={isSelected} hasDiagnosis={hasDiagnosis} matchScores={matchScores} />
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
          <div
            role="button"
            tabIndex={0}
            className="shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
          >
            <BookmarkOutlineIcon />
          </div>
        </div>

        {/* Cover image */}
        {job.coverImageUrl && (
          <div className="-mx-4 mt-3 overflow-hidden bg-gray-100">
            <img
              src={job.coverImageUrl}
              alt=""
              className="w-full aspect-[16/9] object-cover"
              loading="lazy"
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
              <img src={job.companyLogoUrl} alt="" className="h-5 w-5 rounded-sm object-cover" />
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
          <span className="shrink-0 text-gray-400 ml-auto">{formatDate(job.createdAt)}</span>
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
            <span className="flex items-center gap-1 shrink-0 text-base font-bold" style={{ color: ACCENT }}>
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
          <div
            role="link"
            tabIndex={0}
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
            style={{ backgroundColor: `${ACCENT}0a` }}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push("/work_values/start"); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); router.push("/work_values/start"); } }}
          >
            <SparklesIcon />
            <span className="text-gray-600">診断を受けると</span>
            <span className="font-semibold" style={{ color: ACCENT }}>マッチ度</span>
            <span className="text-gray-600">がわかります</span>
          </div>
        )}

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
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="text-xl font-bold leading-tight text-gray-900">
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
        <h4 className="text-base font-bold text-gray-900">{title}</h4>
      </div>
      <dl className="flex flex-col gap-3">
        {filtered.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-gray-500">{r.label}</dt>
            <dd className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function JobDetail({ job, matchScores, onScroll }: { job: JobPostingWithCompany; matchScores: MatchScores | null; onScroll?: React.UIEventHandler<HTMLDivElement> }) {
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
    <div onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain bg-white">
      {/* Cover image with gradient fade */}
      {job.coverImageUrl && (
        <div className="relative w-full overflow-hidden bg-gray-100">
          <img
            src={job.coverImageUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-7">
        {/* Company */}
        <div className="flex items-center gap-3 mt-6">
          <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: ACCENT }}>
                {job.companyName.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{job.companyName}</p>
            {job.location && (
              <p className="text-sm text-gray-500">{job.location}</p>
            )}
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
              <DetailStatCell key={f.label} label={f.label} value={f.value!} icon={f.icon} />
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

function matchScoreColor(score: number): string {
  if (score >= 80) return "#149470";
  if (score >= 55) return "#10b77f";
  if (score >= 30) return "#8aa3d6";
  return "#cfd0cd";
}

function MatchBadge({ label, value }: { label: string; value: number }) {
  const color = matchScoreColor(value);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {value}%
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

function DetailCameraIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DetailDocumentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h6" />
    </svg>
  );
}

function DetailCheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
