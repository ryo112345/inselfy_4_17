"use client";

import { useEffect, useRef } from "react";
import { ApplicationCard } from "@/features/job-application/components/ApplicationCard";
import { ApplicationDetail } from "@/features/job-application/components/ApplicationDetail";
import { DATE_PRESETS, type DatePreset, FILTER_TABS } from "@/features/job-application/constants";
import { useApplicationsSearch } from "@/features/job-application/useApplicationsSearch";

export default function CompanyApplicationsPage() {
  const {
    applications,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    jobFilter,
    setJobFilter,
    keywordInput,
    setKeywordInput,
    keyword,
    datePreset,
    setDatePreset,
    jobPostings,
    selectedId,
    setSelectedId,
    selected,
    detail,
    detailLoading,
    pendingProposal,
    teamWvAvg,
    teamCiAvg,
    teamName,
    handleStatusChange,
    statusCounts,
  } = useApplicationsSearch();

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPanelRef = useRef<HTMLDivElement>(null);
  const panelStuckRef = useRef(false);

  // Detect when split panel becomes sticky
  // biome-ignore lint/correctness/useExhaustiveDependencies: リスト描画後に sticky 判定を張り直すための意図的な依存
  useEffect(() => {
    const panel = splitPanelRef.current;
    if (!panel) return;
    const checkStuck = () => {
      const rect = panel.getBoundingClientRect();
      const stuck = rect.top <= 1;
      if (stuck !== panelStuckRef.current) {
        panelStuckRef.current = stuck;
      }
    };
    window.addEventListener("scroll", checkStuck, { passive: true });
    checkStuck();
    return () => window.removeEventListener("scroll", checkStuck);
  }, [applications, loading]);

  // Forward wheel events to page scroll when header needs to show/hide
  // biome-ignore lint/correctness/useExhaustiveDependencies: リスト描画後に wheel リスナーを張り直すための意図的な依存
  useEffect(() => {
    const panel = splitPanelRef.current;
    if (!panel) return;
    const findScrollParent = (target: EventTarget | null): HTMLElement | null => {
      let el = target as HTMLElement | null;
      while (el && el !== panel) {
        if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "hidden")
          return el;
        el = el.parentElement;
      }
      return null;
    };
    const handler = (e: WheelEvent) => {
      if (!panelStuckRef.current) {
        e.preventDefault();
        window.scrollTo(0, window.scrollY + e.deltaY);
        return;
      }
      if (e.deltaY < 0) {
        const scrollable = findScrollParent(e.target);
        if (!scrollable || scrollable.scrollTop <= 0) {
          e.preventDefault();
          window.scrollTo(0, window.scrollY + e.deltaY);
        }
      }
    };
    panel.addEventListener("wheel", handler, { passive: false });
    return () => panel.removeEventListener("wheel", handler);
  }, [applications, loading]);

  // Save scroll positions continuously
  const restoredScrollRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: リスト描画後にスクロールリスナーを張り直すための意図的な依存
  useEffect(() => {
    const panel = leftPanelRef.current;
    const onPanelScroll = () => {
      if (panel) sessionStorage.setItem("applications_scroll_left", String(panel.scrollTop));
    };
    const onPageScroll = () => {
      sessionStorage.setItem("applications_scroll_page", String(window.scrollY));
    };
    panel?.addEventListener("scroll", onPanelScroll, { passive: true });
    window.addEventListener("scroll", onPageScroll, { passive: true });
    return () => {
      panel?.removeEventListener("scroll", onPanelScroll);
      window.removeEventListener("scroll", onPageScroll);
    };
  }, [applications]);

  // Restore scroll positions once after data loads
  useEffect(() => {
    if (applications.length === 0 || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    requestAnimationFrame(() => {
      const savedLeft = sessionStorage.getItem("applications_scroll_left");
      if (savedLeft && leftPanelRef.current) {
        leftPanelRef.current.scrollTop = Number(savedLeft);
      }
      const savedPage = sessionStorage.getItem("applications_scroll_page");
      if (savedPage) {
        window.scrollTo(0, Number(savedPage));
      }
      sessionStorage.removeItem("applications_scroll_left");
      sessionStorage.removeItem("applications_scroll_page");
    });
  }, [applications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">応募一覧</h1>
        <p className="text-sm text-gray-500">{total}件</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          const count =
            tab.value === "" ? total : statusFilter === "" ? (statusCounts[tab.value] ?? 0) : null;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
              {count !== null && count > 0 && (
                <span className={`ml-1.5 ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Keyword search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="名前・スキル・求人で検索"
            className="rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 w-52"
          />
          {keywordInput && (
            <button
              type="button"
              onClick={() => setKeywordInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Job posting filter */}
        {jobPostings.length > 0 && (
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 max-w-48 truncate"
          >
            <option value="">すべての求人</option>
            {jobPostings.map((jp) => (
              <option key={jp.id} value={jp.id}>
                {jp.title}
              </option>
            ))}
          </select>
        )}

        {/* Date range filter */}
        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value as DatePreset)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Active filter count */}
        {(jobFilter || keyword || datePreset) && (
          <button
            type="button"
            onClick={() => {
              setKeywordInput("");
              setJobFilter("");
              setDatePreset("");
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            フィルターをリセット
          </button>
        )}
      </div>

      {/* Main content */}
      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div
          className="relative left-1/2 -translate-x-1/2 flex rounded-xl border border-gray-200 bg-white overflow-hidden"
          style={{
            width: "calc(100vw - 48px)",
            height: "calc(100vh - 220px)",
            minHeight: 400,
          }}
        >
          <div className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 p-3 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-100 p-4">
                <div className="flex gap-3.5">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-center animate-pulse">
            <div className="h-32 w-32 rounded-full bg-gray-100" />
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">応募はまだありません</p>
        </div>
      ) : (
        <div
          ref={splitPanelRef}
          className="sticky top-0 ml-[50%] -translate-x-1/2 flex border border-gray-200 rounded-xl bg-white overflow-hidden"
          style={{
            width: "calc(100vw - 48px)",
            height: "100vh",
            minHeight: 400,
          }}
        >
          {/* Left panel — card list */}
          <div
            ref={leftPanelRef}
            className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 bg-gray-50/60 overflow-y-auto"
          >
            <div className="p-2.5 space-y-1.5">
              {applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  isSelected={app.id === selectedId}
                  onSelect={() => setSelectedId(app.id)}
                />
              ))}
            </div>
          </div>

          {/* Right panel — detail */}
          <div className="hidden lg:block flex-1 min-h-0 bg-gray-50/50 overflow-y-auto">
            {selected ? (
              <ApplicationDetail
                selected={selected}
                detail={detail}
                detailLoading={detailLoading}
                pendingProposal={pendingProposal}
                teamWvAvg={teamWvAvg}
                teamCiAvg={teamCiAvg}
                teamName={teamName}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">候補者を選択してください</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
