"use client";

import { type RefCallback, useCallback, useEffect, useRef } from "react";
import { CandidateDetail } from "@/features/talent-search/components/CandidateDetail";
import { DiagnosticCandidateCard } from "@/features/talent-search/components/DiagnosticCandidateCard";
import { DiagnosticPanel } from "@/features/talent-search/components/DiagnosticPanel";
import { SearchFilterPanel } from "@/features/talent-search/components/SearchFilterPanel";
import { useCandidateDetail } from "@/features/talent-search/useCandidateDetail";
import { TALENTS_PAGE_SIZE, useTalentSearch } from "@/features/talent-search/useTalentSearch";

export default function TalentsPage() {
  const search = useTalentSearch();
  const {
    users,
    total,
    loading,
    loadingMore,
    searched,
    hasMore,
    handleLoadMore,
    diagnosticType,
    compareWv,
    compareCi,
    compareDisplayLabel,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    savedSet,
    toggleSave,
  } = search;

  const detail = useCandidateDetail(users, selectedUserId);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPanelRef = useRef<HTMLDivElement>(null);

  // Detect when split panel becomes sticky (header/search scrolled out of view)
  const panelStuckRef = useRef(false);
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
  }, [users, loading]);

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
      // Scrolling down, header still visible → forward to page
      if (!panelStuckRef.current) {
        e.preventDefault();
        window.scrollTo(0, window.scrollY + e.deltaY);
        return;
      }
      // Scrolling up while panel is at top → forward to page to reveal header
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
  }, [users, loading]);

  const restoredScrollRef = useRef(false);

  // Continuously save scroll positions and loaded count so values are always fresh
  useEffect(() => {
    const panel = leftPanelRef.current;
    const onPanelScroll = () => {
      if (panel) sessionStorage.setItem("talents_scroll_left", String(panel.scrollTop));
    };
    const onPageScroll = () => {
      sessionStorage.setItem("talents_scroll_page", String(window.scrollY));
    };
    panel?.addEventListener("scroll", onPanelScroll, { passive: true });
    window.addEventListener("scroll", onPageScroll, { passive: true });
    if (users.length > TALENTS_PAGE_SIZE) {
      sessionStorage.setItem("talents_loaded_count", String(users.length));
    } else {
      sessionStorage.removeItem("talents_loaded_count");
    }
    return () => {
      panel?.removeEventListener("scroll", onPanelScroll);
      window.removeEventListener("scroll", onPageScroll);
    };
  }, [users]);

  // Restore scroll positions once after results load
  useEffect(() => {
    if (users.length === 0 || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    requestAnimationFrame(() => {
      const saved = sessionStorage.getItem("talents_scroll_left");
      if (saved && leftPanelRef.current) {
        leftPanelRef.current.scrollTop = Number(saved);
      }
      const savedPage = sessionStorage.getItem("talents_scroll_page");
      if (savedPage) {
        window.scrollTo(0, Number(savedPage));
      }
      sessionStorage.removeItem("talents_scroll_left");
      sessionStorage.removeItem("talents_scroll_page");
    });
  }, [users]);

  const panelSentinelObserver = useRef<IntersectionObserver | null>(null);

  const panelSentinelRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      if (panelSentinelObserver.current) panelSentinelObserver.current.disconnect();
      if (!node || !hasMore) return;
      const scrollParent = node.closest(".overflow-y-auto");
      panelSentinelObserver.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loadingMore) handleLoadMore();
        },
        { root: scrollParent, rootMargin: "200px" },
      );
      panelSentinelObserver.current.observe(node);
    },
    [hasMore, loadingMore, handleLoadMore],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">人材を探す</h1>
      </div>

      {/* ── Layer 1: Search & Condition Filters ── */}
      <SearchFilterPanel search={search} />

      {/* ── Layer 2: Diagnostic Matching (optional enhancement) ── */}
      <DiagnosticPanel search={search} />

      {/* Results header */}
      {searched && !loading && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `${total}件中 ${users.length}件を表示`
              : "条件に合う候補者が見つかりませんでした"}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          className="relative left-1/2 -translate-x-1/2 flex rounded-xl border border-gray-200 bg-white overflow-hidden"
          style={{ width: "calc(100vw - 48px)", height: "calc(100vh - 300px)", minHeight: 400 }}
        >
          <div className="w-full lg:w-[400px] lg:shrink-0 lg:border-r border-gray-200 p-3 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-100 p-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-center animate-pulse">
            <div className="h-64 w-64 rounded-full bg-gray-100" />
          </div>
        </div>
      )}

      {/* Split layout — sticky full-width panel */}
      {!loading && users.length > 0 && (
        <div
          ref={splitPanelRef}
          data-testid="diagnostic-split-panel"
          className="sticky top-0 ml-[50%] -translate-x-1/2 flex border-t border-gray-200 bg-white overflow-hidden"
          style={{ width: "calc(100vw - 48px)", height: "100vh" }}
        >
          {/* Left Panel - candidate list */}
          <div
            ref={leftPanelRef}
            className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 bg-gray-50/60 overflow-y-auto"
          >
            <ul className="p-2.5 space-y-1.5">
              {users.map((u) => (
                <li key={u.userId}>
                  <DiagnosticCandidateCard
                    user={u}
                    isSelected={selectedUserId === u.userId}
                    onSelect={() => setSelectedUserId(u.userId)}
                    diagnosticType={diagnosticType}
                    isSaved={savedSet.has(u.userId)}
                    onToggleSave={() => toggleSave(u.userId)}
                  />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div ref={panelSentinelRef} className="flex justify-center py-4">
                {loadingMore && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                )}
              </div>
            )}
          </div>

          {/* Right Panel - detail with radar charts */}
          <div className="hidden lg:block flex-1 min-h-0 bg-gray-50/50 overflow-y-auto">
            {selectedUser ? (
              <>
                {detail.error && (
                  <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">候補者情報の読み込みに失敗しました</p>
                    <button
                      type="button"
                      onClick={detail.reload}
                      className="text-sm font-medium text-red-700 underline hover:no-underline cursor-pointer"
                    >
                      再読み込み
                    </button>
                  </div>
                )}
                <CandidateDetail
                  user={selectedUser}
                  wvScores={detail.wvScores}
                  ciScores={detail.ciScores}
                  loading={detail.loading}
                  compareWv={compareWv}
                  compareCi={compareCi}
                  compareLabel={compareDisplayLabel}
                  allExperiences={detail.experiences}
                  allSkills={detail.skills}
                  about={detail.about}
                  diagnosticType={diagnosticType}
                  isSaved={savedSet.has(selectedUser.userId)}
                  onToggleSave={() => toggleSave(selectedUser.userId)}
                />
              </>
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

      {/* Empty state */}
      {searched && !loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={1.5}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">検索条件を変更して再度お試しください</p>
        </div>
      )}
    </div>
  );
}
