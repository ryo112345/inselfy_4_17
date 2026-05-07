"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchCompanyApplications,
  updateApplicationStatus,
} from "@/features/job-application/api";
import type { JobApplication } from "@/features/job-application/api";
import {
  SingleRadarChart,
  WV_ORDER,
  WV_FULL_LABELS,
  CI_ORDER,
  CI_FULL_LABELS,
} from "@/app/components/SingleRadarChart";

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

const STATUS_OPTIONS = [
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

const SEEKING_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
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

type CandidateExperience = {
  companyName: string;
  title: string;
  isCurrent: boolean;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  description: string;
};

type CandidateDetail = {
  experiences: CandidateExperience[];
  skills: string[];
  about: string | null;
  jobSeekingStatus: string | null;
  profileColor: string | null;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
};

function daysAgo(dateStr: string): string {
  const d = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
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
  const initialStatus = searchParams.get("status") ?? "";
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const [teamWvAvg, setTeamWvAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamCiAvg, setTeamCiAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const load = useCallback((status: string) => {
    setLoading(true);
    fetchCompanyApplications({
      status: status || undefined,
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
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter, load]);

  useEffect(() => {
    if (!selected?.jobPostingId) {
      setTeamWvAvg(null);
      setTeamCiAvg(null);
      setTeamName("");
      return;
    }
    fetch(`/api/company/jobs/${selected.jobPostingId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((job) => {
        if (!job?.teamId) {
          setTeamWvAvg(null);
          setTeamCiAvg(null);
          setTeamName("");
          return;
        }
        setTeamName(job.teamName ?? "チーム");
        return fetch(`/api/company/teams/${job.teamId}/scores`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.members) { setTeamWvAvg(null); setTeamCiAvg(null); return; }
            const wvAccum: Record<string, { sum: number; count: number }> = {};
            const ciAccum: Record<string, { sum: number; count: number }> = {};
            for (const m of data.members) {
              if (m.wv_scores) {
                for (const s of m.wv_scores) {
                  if (!wvAccum[s.id]) wvAccum[s.id] = { sum: 0, count: 0 };
                  wvAccum[s.id].sum += s.display_score;
                  wvAccum[s.id].count++;
                }
              }
              if (m.ci_scores) {
                for (const s of m.ci_scores) {
                  if (!ciAccum[s.id]) ciAccum[s.id] = { sum: 0, count: 0 };
                  ciAccum[s.id].sum += s.display_score;
                  ciAccum[s.id].count++;
                }
              }
            }
            const wvAvg = Object.entries(wvAccum).map(([id, { sum, count }]) => ({ id, score: sum / count }));
            const ciAvg = Object.entries(ciAccum).map(([id, { sum, count }]) => ({ id, score: sum / count }));
            setTeamWvAvg(wvAvg.length > 0 ? wvAvg : null);
            setTeamCiAvg(ciAvg.length > 0 ? ciAvg : null);
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
    const username = selected.candidateUsername;
    const candidateId = selected.candidateId;
    setDetailLoading(true);
    Promise.all([
      fetch(`/api/users/${username}/experiences`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`/api/users/${username}/skills`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`/api/users/${username}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/work-values/users/${candidateId}/results/latest`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/career-interest/users/${candidateId}/results/latest`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([expData, skillData, profileData, wvData, ciData]) => {
        const rawExps = expData.items ?? expData.experiences ?? [];
        setDetail({
          experiences: rawExps.map((e: Record<string, unknown>) => ({
            companyName: (e.companyName ?? e.company_name ?? "") as string,
            title: (e.title ?? "") as string,
            isCurrent: (e.isCurrent ?? e.is_current ?? false) as boolean,
            startYear: (e.startYear ?? e.start_year ?? 0) as number,
            startMonth: (e.startMonth ?? e.start_month ?? 0) as number,
            endYear: (e.endYear ?? e.end_year ?? null) as number | null,
            endMonth: (e.endMonth ?? e.end_month ?? null) as number | null,
            description: (e.description ?? "") as string,
          })),
          skills: (skillData.items ?? skillData.skills ?? []).map(
            (s: { name: string }) => s.name,
          ),
          about: profileData?.about ?? null,
          jobSeekingStatus: profileData?.jobSeekingStatus ?? profileData?.job_seeking_status ?? null,
          profileColor: profileData?.profileColor ?? profileData?.profile_color ?? null,
          wvScores:
            wvData?.values?.map(
              (v: { value_id: string; display_score: number }) => ({
                id: v.value_id,
                score: v.display_score,
              }),
            ) ?? null,
          ciScores:
            ciData?.type_scores?.map(
              (s: { type_id: string; score: number }) => ({
                id: s.type_id,
                score: s.score,
              }),
            ) ?? null,
        });
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected?.candidateUsername, selected?.candidateId, selected?.id]);

  const handleStatusChange = async (
    applicationId: string,
    newStatus: string,
  ) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: newStatus } : a,
        ),
      );
    } catch {
      load(statusFilter);
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
            tab.value === ""
              ? total
              : statusFilter === ""
                ? statusCounts[tab.value] ?? 0
                : null;
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
                <span
                  className={`ml-1.5 ${isActive ? "text-gray-300" : "text-gray-400"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
          className="sticky top-0 ml-[50%] -translate-x-1/2 flex border border-gray-200 rounded-xl bg-white overflow-hidden"
          style={{
            width: "calc(100vw - 48px)",
            height: "calc(100vh - 220px)",
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
                const initials =
                  app.candidateName?.charAt(0) ?? "?";
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={`w-full text-left rounded-xl px-4 py-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white ring-1 ring-blue-200 shadow-sm"
                        : "hover:bg-white/60"
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
                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-white text-[15px] font-bold shrink-0">
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
                        <span className="text-gray-700 font-medium">
                          {app.jobTitle}
                        </span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className="text-gray-400">
                          {daysAgo(app.createdAt)}
                        </span>
                      </p>
                    </div>

                    {/* Row 3: message preview */}
                    {app.message && (
                      <p className="mt-2 text-[13px] text-gray-400 truncate">
                        {app.message}
                      </p>
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
                        backgroundColor:
                          detail?.profileColor ?? "#94a3b8",
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
                      {detail?.jobSeekingStatus &&
                        SEEKING_STATUS_MAP[detail.jobSeekingStatus] && (
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
                      <p className="text-sm text-gray-500 mt-1">
                        {selected.candidateHeadline}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      応募日:{" "}
                      {new Date(selected.createdAt).toLocaleDateString(
                        "ja-JP",
                      )}{" "}
                      ({daysAgo(selected.createdAt)})
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

                <div className="border-t border-gray-100" />

                {/* ── Status control ── */}
                <div className="py-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    ステータス変更
                  </h3>
                  {selected.status === "withdrawn" ? (
                    <p className="text-sm text-gray-400">
                      候補者が辞退しました
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {STATUS_OPTIONS.map((opt) => {
                        const isCurrent = selected.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              if (!isCurrent)
                                handleStatusChange(selected.id, opt.value);
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
                                  <p className="text-sm text-gray-500 mt-0.5">
                                    {exp.companyName}
                                  </p>
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">
                            価値観（Work Values）
                          </h4>
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">
                            適職（Career Interest）
                          </h4>
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
                <p className="text-sm text-gray-500">
                  候補者を選択してください
                </p>
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
