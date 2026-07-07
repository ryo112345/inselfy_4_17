"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
import { checkPendingProposal } from "@/features/interview/api";
import type { JobApplication, JobApplicationStatus } from "@/features/job-application/api";
import { fetchCompanyApplications, updateApplicationStatus } from "@/features/job-application/api";
import { fetchJobPosting, fetchJobPostings } from "@/features/job-posting/api";
import {
  type CandidateDetail,
  fetchCandidateDetail,
  fetchTeamScoreAverages,
} from "@/features/talent-search/api";

const STATUS_LABELS: Record<string, string> = {
  applied: "応募受付",
  screening: "書類選考",
  interview: "面接",
  offer: "内定",
  accepted: "内定承諾",
  rejected: "不合格",
  withdrawn: "辞退",
};

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-50 text-blue-700",
  screening: "bg-amber-50 text-amber-700",
  interview: "bg-purple-50 text-purple-700",
  offer: "bg-emerald-50 text-emerald-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: "applied", label: "応募受付" },
  { value: "screening", label: "書類選考" },
  { value: "interview", label: "面接" },
  { value: "offer", label: "内定" },
  { value: "accepted", label: "内定承諾" },
  { value: "rejected", label: "不合格" },
];

const FILTER_TABS = [
  { value: "", label: "すべて" },
  { value: "applied", label: "応募受付" },
  { value: "screening", label: "書類選考" },
  { value: "interview", label: "面接" },
  { value: "offer", label: "内定" },
  { value: "accepted", label: "内定承諾" },
  { value: "rejected", label: "不合格" },
  { value: "withdrawn", label: "辞退" },
];

const SEEKING_STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> =
  {
    active: {
      label: "スカウト歓迎",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-400",
    },
    open: {
      label: "いい話があれば",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-400",
    },
    not_seeking: {
      label: "スカウト不要",
      bg: "bg-gray-100",
      text: "text-gray-500",
      dot: "bg-gray-300",
    },
  };

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

function AppMatchBadges({ app }: { app: JobApplication }) {
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

type DatePreset = "" | "today" | "week" | "month" | "3months";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "", label: "全期間" },
  { value: "today", label: "今日" },
  { value: "week", label: "直近1週間" },
  { value: "month", label: "直近1ヶ月" },
  { value: "3months", label: "直近3ヶ月" },
];

function datePresetToRange(preset: DatePreset): { from?: string; to?: string } {
  if (!preset) return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let from: Date;
  switch (preset) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3months":
      from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function daysAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "今日";
  if (d === 1) return "昨日";
  return `${d}日前`;
}

function formatPeriod(
  startYear: number,
  startMonth: number,
  endYear?: number | null,
  endMonth?: number | null,
  isCurrent?: boolean,
) {
  const start = `${startYear}年${startMonth}月`;
  if (isCurrent) return `${start} — 現在`;
  if (endYear && endMonth) return `${start} — ${endYear}年${endMonth}月`;
  return start;
}

export default function CompanyApplicationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams.get("status") ?? "";
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [jobFilter, setJobFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [jobPostings, setJobPostings] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("selected") ?? null);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPanelRef = useRef<HTMLDivElement>(null);
  const panelStuckRef = useRef(false);

  const [pendingProposal, setPendingProposal] = useState<{
    hasPending: boolean;
    createdAt?: string;
  } | null>(null);

  const [teamWvAvg, setTeamWvAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamCiAvg, setTeamCiAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    fetchJobPostings()
      .then((jobs) => setJobPostings(jobs.map((j) => ({ id: j.id, title: j.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput), 300);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const dateRange = useMemo(() => datePresetToRange(datePreset), [datePreset]);

  const load = useCallback(
    (status: string, jobPostingId: string, kw: string, dr: { from?: string; to?: string }) => {
      setLoading(true);
      fetchCompanyApplications({
        status: status || undefined,
        jobPostingId: jobPostingId || undefined,
        keyword: kw || undefined,
        dateFrom: dr.from,
        dateTo: dr.to,
        limit: 50,
        offset: 0,
      })
        .then((res) => {
          const items = res.items ?? [];
          setApplications(items);
          setTotal(res.total);
          setSelectedId((prev) => {
            if (prev && items.some((a) => a.id === prev)) return prev;
            return items[0]?.id ?? null;
          });
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(statusFilter, jobFilter, keyword, dateRange);
  }, [statusFilter, jobFilter, keyword, dateRange, load]);

  useEffect(() => {
    if (!selected?.id) {
      setPendingProposal(null);
      return;
    }
    checkPendingProposal(selected.id)
      .then(setPendingProposal)
      .catch(() => setPendingProposal(null));
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.jobPostingId) {
      setTeamWvAvg(null);
      setTeamCiAvg(null);
      setTeamName("");
      return;
    }
    fetchJobPosting(selected.jobPostingId)
      .then((job) => {
        if (!job.teamId) {
          setTeamWvAvg(null);
          setTeamCiAvg(null);
          setTeamName("");
          return;
        }
        setTeamName("チーム");
        return fetchTeamScoreAverages(job.teamId).then(({ wvAvg, ciAvg }) => {
          setTeamWvAvg(wvAvg);
          setTeamCiAvg(ciAvg);
        });
      })
      .catch(() => {
        setTeamWvAvg(null);
        setTeamCiAvg(null);
        setTeamName("");
      });
  }, [selected?.jobPostingId]);

  useEffect(() => {
    if (!selected?.candidateUsername) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchCandidateDetail(selected.candidateUsername, selected.candidateId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected?.candidateUsername, selected?.candidateId, selected?.id]);

  // Detect when split panel becomes sticky
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

  // Sync selectedId and statusFilter to URL for back-navigation
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (selectedId) params.set("selected", selectedId);
    const qs = params.toString();
    const target = qs ? `/company/applications?${qs}` : "/company/applications";
    router.replace(target, { scroll: false });
  }, [selectedId, statusFilter, router]);

  // Save scroll positions continuously
  const restoredScrollRef = useRef(false);
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

  const handleStatusChange = async (applicationId: string, newStatus: JobApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)),
      );
    } catch {
      load(statusFilter, jobFilter, keyword, dateRange);
    }
  };

  const statusCounts = applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

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
              {applications.map((app) => {
                const isSelected = app.id === selectedId;
                const initials = app.candidateName?.charAt(0) ?? "?";
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={`w-full text-left rounded-xl px-4 py-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white ring-1 ring-blue-200 shadow-sm"
                        : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
                    }`}
                  >
                    {/* Row 1: avatar + name + status */}
                    <div className="flex items-center gap-3.5">
                      {app.candidateAvatar ? (
                        <img
                          src={app.candidateAvatar}
                          alt=""
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
                          <p className="text-[15px] text-gray-500 truncate mt-0.5">
                            {app.candidateHeadline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Match badges */}
                    <AppMatchBadges app={app} />

                    {/* Row 2: job title + elapsed time */}
                    <div className="mt-3 flex items-center gap-1.5 min-w-0">
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
                        <span className="text-gray-700 font-medium">{app.jobTitle}</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className="text-gray-400">{daysAgo(app.createdAt)}</span>
                      </p>
                    </div>

                    {/* Row 3: skills + seeking status */}
                    {((app.candidateSkills && app.candidateSkills.length > 0) ||
                      app.candidateSeekingStatus) && (
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
                        {app.candidateSeekingStatus &&
                          SEEKING_STATUS_MAP[app.candidateSeekingStatus] && (
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
              })}
            </div>
          </div>

          {/* Right panel — detail */}
          <div className="hidden lg:block flex-1 min-h-0 bg-gray-50/50 overflow-y-auto">
            {selected ? (
              <div className="flex-1 p-8 space-y-0">
                {/* ── Header ── */}
                <div className="flex items-start gap-4 pb-6">
                  {selected.candidateAvatar ? (
                    <img
                      src={selected.candidateAvatar}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 ring-2 ring-white shadow-sm"
                      style={{
                        backgroundColor: detail?.profileColor ?? "#94a3b8",
                      }}
                    >
                      {selected.candidateName?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">
                        {selected.candidateName}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {STATUS_LABELS[selected.status] ?? selected.status}
                      </span>
                      {detail?.jobSeekingStatus && SEEKING_STATUS_MAP[detail.jobSeekingStatus] && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].bg} ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].text}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${SEEKING_STATUS_MAP[detail.jobSeekingStatus].dot}`}
                          />
                          {SEEKING_STATUS_MAP[detail.jobSeekingStatus].label}
                        </span>
                      )}
                    </div>
                    {selected.candidateHeadline && (
                      <p className="text-sm text-gray-500 mt-1">{selected.candidateHeadline}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <AppMatchBadges app={selected} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      応募日: {new Date(selected.createdAt).toLocaleDateString("ja-JP")} (
                      {daysAgo(selected.createdAt)})
                    </p>
                  </div>
                  {selected.candidateUsername && (
                    <Link
                      href={`/profile/${selected.candidateUsername}`}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      プロフィール →
                    </Link>
                  )}
                </div>

                {/* ── Action buttons ── */}
                <div className="flex items-center gap-2 pb-6">
                  <Link
                    href={`/company/messages?candidateId=${selected.candidateId}&candidateName=${encodeURIComponent(selected.candidateName ?? "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                      />
                    </svg>
                    メッセージを送る
                  </Link>
                  <Link
                    href={`/company/calendar/propose?applicationId=${selected.id}&candidateName=${encodeURIComponent(selected.candidateName ?? "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {pendingProposal?.hasPending ? "日程を再提案" : "日程を提案"}
                  </Link>
                  {pendingProposal?.hasPending && (
                    <span className="text-xs text-amber-600">提案済み・回答待ち</span>
                  )}
                </div>

                <div className="border-t border-gray-100" />

                {/* ── Status control ── */}
                <div className="py-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    ステータス変更
                  </h3>
                  {selected.status === "withdrawn" ? (
                    <p className="text-sm text-gray-400">候補者が辞退しました</p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {STATUS_OPTIONS.map((opt) => {
                        const isCurrent = selected.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              if (!isCurrent) handleStatusChange(selected.id, opt.value);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              isCurrent
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100" />

                {/* ── Applied job ── */}
                <div className="py-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    応募求人
                  </h3>
                  <Link
                    href={`/company/jobs/${selected.jobPostingId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selected.jobTitle}
                  </Link>
                </div>

                {/* ── Application message ── */}
                {selected.message && (
                  <>
                    <div className="border-t border-gray-100" />
                    <div className="py-5">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        応募メッセージ
                      </h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {selected.message}
                      </p>
                    </div>
                  </>
                )}

                <div className="border-t border-gray-100" />

                {/* ── Candidate details ── */}
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                  </div>
                ) : detail ? (
                  <>
                    {/* About */}
                    {detail.about && (
                      <>
                        <AboutSection about={detail.about} />
                        <div className="border-t border-gray-100" />
                      </>
                    )}

                    {/* Experiences */}
                    {detail.experiences.length > 0 && (
                      <>
                        <div className="py-5">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            職歴
                          </h3>
                          <div className="space-y-0">
                            {detail.experiences.map((exp, i) => (
                              <div key={i} className="flex gap-3 group">
                                <div className="flex flex-col items-center w-4 shrink-0">
                                  <div
                                    className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${
                                      exp.isCurrent
                                        ? "border-blue-500 bg-blue-500"
                                        : "border-gray-300 bg-white group-hover:border-gray-400"
                                    }`}
                                  />
                                  {i < detail.experiences.length - 1 && (
                                    <div className="w-px flex-1 bg-gray-200 my-0.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-4">
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {exp.title}
                                    </p>
                                    {exp.isCurrent && (
                                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 leading-none">
                                        現職
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-0.5">{exp.companyName}</p>
                                  {exp.startYear > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatPeriod(
                                        exp.startYear,
                                        exp.startMonth,
                                        exp.endYear,
                                        exp.endMonth,
                                        exp.isCurrent,
                                      )}
                                    </p>
                                  )}
                                  {exp.description && (
                                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                                      {exp.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border-t border-gray-100" />
                      </>
                    )}

                    {/* Skills */}
                    {detail.skills.length > 0 && (
                      <>
                        <div className="py-5">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                            スキル
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.skills.map((s) => (
                              <span
                                key={s}
                                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="border-t border-gray-100" />
                      </>
                    )}

                    {/* Diagnostic Charts */}
                    <div className="py-5">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        診断結果
                      </h3>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-150 bg-white p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-700">
                              価値観（Work Values）
                            </h4>
                            {selected.wvSimilarity != null && (
                              <span className="text-xs text-gray-400">
                                {Math.round(selected.wvSimilarity)}% match
                              </span>
                            )}
                          </div>
                          {detail.wvScores ? (
                            <SingleRadarChart
                              scores={detail.wvScores}
                              order={WV_ORDER}
                              fullLabels={WV_FULL_LABELS}
                              isWV={true}
                              compareScores={teamWvAvg}
                              compareLabel={teamName}
                            />
                          ) : (
                            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                              未受験
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl border border-gray-150 bg-white p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-700">
                              適職（Career Interest）
                            </h4>
                            {selected.ciSimilarity != null && (
                              <span className="text-xs text-gray-400">
                                {Math.round(selected.ciSimilarity)}% match
                              </span>
                            )}
                          </div>
                          {detail.ciScores ? (
                            <SingleRadarChart
                              scores={detail.ciScores}
                              order={CI_ORDER}
                              fullLabels={CI_FULL_LABELS}
                              isWV={false}
                              compareScores={teamCiAvg}
                              compareLabel={teamName}
                            />
                          ) : (
                            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                              未受験
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
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

function AboutSection({ about }: { about: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = about.length > 200;

  return (
    <div className="py-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        自己紹介
      </h3>
      <p
        className={`text-sm text-gray-600 whitespace-pre-line leading-relaxed ${!expanded && needsExpand ? "line-clamp-3" : ""}`}
      >
        {about}
      </p>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-600 mt-1 cursor-pointer"
        >
          {expanded ? "閉じる" : "もっと見る"}
        </button>
      )}
    </div>
  );
}
