"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SEARCH_EMPLOYMENT_TYPES,
  SEARCH_JOB_CATEGORIES,
  SEARCH_REMOTE_POLICIES,
} from "@/constants/job-options";
import { ACCENT } from "@/constants/theme";
import { JobCard } from "@/features/job-search/components/JobCard";
import { JobDetail } from "@/features/job-search/components/JobDetailPanel";
import {
  type InitialJobSearchData,
  type SortKey,
  useJobSearch,
} from "@/features/job-search/useJobSearch";
import { ValuesFilterDrawer } from "@/features/work-values/ValuesFilterDrawer";

export function JobsPageClient({ initialData }: { initialData?: InitialJobSearchData }) {
  const jobSearch = useJobSearch(initialData);
  const {
    jobs,
    total,
    loading,
    loadingMore,
    error,
    loadMore,
    selectedId,
    setSelectedId,
    selectedJob,
    hasDiagnosis,
    userWv,
    matchScoresMap,
    search,
    setSearch,
    category,
    setCategory,
    employment,
    setEmployment,
    remote,
    setRemote,
    sort,
    setSort,
    filterMode,
    setFilterMode,
    valueThresholds,
    setValueThresholds,
    needThresholds,
    setNeedThresholds,
    activeFilterCount,
  } = jobSearch;

  const [valuesFilterOpen, setValuesFilterOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    (lastRef: React.MutableRefObject<number>) => (e: React.UIEvent<HTMLDivElement>) => {
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
  const handleRightScroll = useMemo(
    () => makeScrollHandler(lastScrollRightRef),
    [makeScrollHandler],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const hasMore = jobs.length < total;
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [jobs.length, total, loadingMore, loadMore]);

  return (
    <div className="h-screen md:pl-[50px] flex flex-col bg-[var(--background)] overflow-hidden">
      {/* Filter Bar */}
      <div
        ref={filterRef}
        className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 md:px-6 md:py-3 transition-[transform,margin-bottom] duration-300 ease-in-out will-change-transform"
        style={{
          transform: filterBarVisible ? "none" : "translateY(-100%)",
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
          <FilterSelect
            label="職種"
            value={category}
            onChange={setCategory}
            options={SEARCH_JOB_CATEGORIES}
          />
          <FilterSelect
            label="雇用形態"
            value={employment}
            onChange={setEmployment}
            options={SEARCH_EMPLOYMENT_TYPES}
          />
          <FilterSelect
            label="リモート"
            value={remote}
            onChange={setRemote}
            options={SEARCH_REMOTE_POLICIES}
          />

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
        <div
          ref={listRef}
          onScroll={handleLeftScroll}
          className="w-full lg:w-[440px] lg:shrink-0 border-r border-gray-200 overflow-y-auto overscroll-contain bg-[var(--background)]"
        >
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
            <JobDetail
              job={selectedJob}
              matchScores={selectedJob ? (matchScoresMap.get(selectedJob.id) ?? null) : null}
              onScroll={handleRightScroll}
            />
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
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
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
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Icons ── */

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
    </svg>
  );
}

function EmptyDetailIcon() {
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d1d5db"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 7h8M8 11h5M8 15h8" />
    </svg>
  );
}

function EmptySearchIcon() {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d1d5db"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
      <path d="M8 8l5 5M13 8l-5 5" />
    </svg>
  );
}
