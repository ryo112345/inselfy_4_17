"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
import {
  type TalentCard as Candidate,
  type CandidateExperience,
  fetchCandidateDetail,
  fetchSavedCandidates,
  unsaveCandidate,
} from "@/features/talent-search/api";

const SEEKING_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "スカウト歓迎", bg: "bg-emerald-50", text: "text-emerald-700" },
  open: { label: "いい話があれば", bg: "bg-amber-50", text: "text-amber-700" },
  not_seeking: { label: "スカウト不要", bg: "bg-gray-100", text: "text-gray-500" },
};

const PAGE_SIZE = 20;

export default function SavedCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detail panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailWv, setDetailWv] = useState<{ id: string; score: number }[] | null>(null);
  const [detailCi, setDetailCi] = useState<{ id: string; score: number }[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExperiences, setDetailExperiences] = useState<CandidateExperience[]>([]);
  const [detailSkills, setDetailSkills] = useState<string[]>([]);
  const [detailAbout, setDetailAbout] = useState<string | null>(null);

  const fetchCandidates = useCallback(
    async (append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const offset = append ? candidates.length : 0;
        const { users: newUsers, total } = await fetchSavedCandidates(PAGE_SIZE, offset);
        if (append) {
          setCandidates((prev) => {
            const seen = new Set(prev.map((u) => u.userId));
            return [...prev, ...newUsers.filter((u) => !seen.has(u.userId))];
          });
        } else {
          setCandidates(newUsers);
        }
        setTotal(total);
        setHasMore(offset + newUsers.length < total);
      } catch {
        if (!append) {
          setCandidates([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [candidates.length],
  );

  useEffect(() => {
    fetchCandidates(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Auto-select first
  useEffect(() => {
    if (
      candidates.length > 0 &&
      (!selectedUserId || !candidates.some((u) => u.userId === selectedUserId))
    ) {
      setSelectedUserId(candidates[0].userId);
    }
  }, [candidates, selectedUserId]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchCandidates(true);
      },
      { root: leftPanelRef.current, rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, fetchCandidates]);

  // Fetch detail
  useEffect(() => {
    if (!selectedUserId) {
      setDetailWv(null);
      setDetailCi(null);
      setDetailExperiences([]);
      setDetailSkills([]);
      setDetailAbout(null);
      return;
    }
    const user = candidates.find((u) => u.userId === selectedUserId);
    if (!user) return;
    setDetailLoading(true);
    fetchCandidateDetail(user.username, selectedUserId)
      .then((detail) => {
        setDetailWv(detail.wvScores);
        setDetailCi(detail.ciScores);
        setDetailExperiences(detail.experiences);
        setDetailSkills(detail.skills);
        setDetailAbout(detail.about);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedUserId, candidates]);

  const selectedUser = useMemo(
    () => (selectedUserId ? (candidates.find((u) => u.userId === selectedUserId) ?? null) : null),
    [candidates, selectedUserId],
  );

  const handleUnsave = useCallback(async (userId: string) => {
    await unsaveCandidate(userId);
    setCandidates((prev) => prev.filter((c) => c.userId !== userId));
    setTotal((prev) => prev - 1);
  }, []);

  // ── Loading state ──
  if (loading && candidates.length === 0) {
    return (
      <div>
        <Header total={0} />
        <div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // ── Empty state ──
  if (candidates.length === 0) {
    return (
      <div>
        <Header total={0} />
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">保存した候補者はまだいません</p>
          <Link
            href="/company/talents"
            className="mt-3 inline-block text-sm font-medium text-[#2979ff] hover:underline"
          >
            人材を探す →
          </Link>
        </div>
      </div>
    );
  }

  // ── Split panel ──
  return (
    <div>
      <Header total={total} />

      <div
        className="sticky top-0 ml-[50%] -translate-x-1/2 flex border-t border-gray-200 bg-white overflow-hidden"
        style={{ width: "calc(100vw - 48px)", height: "calc(100vh - 60px)" }}
      >
        {/* Left Panel */}
        <div
          ref={leftPanelRef}
          className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 bg-gray-50/60 overflow-y-auto"
        >
          <ul className="p-2.5 space-y-1.5">
            {candidates.map((u) => (
              <li key={u.userId}>
                <CandidateCard
                  user={u}
                  isSelected={selectedUserId === u.userId}
                  onSelect={() => setSelectedUserId(u.userId)}
                  onUnsave={() => handleUnsave(u.userId)}
                />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              )}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="hidden lg:block flex-1 min-h-0 bg-gray-50/50 overflow-y-auto">
          {selectedUser ? (
            <CandidateDetail
              user={selectedUser}
              wvScores={detailWv}
              ciScores={detailCi}
              loading={detailLoading}
              allExperiences={detailExperiences}
              allSkills={detailSkills}
              about={detailAbout}
              onUnsave={() => handleUnsave(selectedUser.userId)}
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
    </div>
  );
}

// ── Header ──
function Header({ total }: { total: number }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">
        保存した候補者
        {total > 0 && <span className="ml-2 text-base font-normal text-gray-500">({total}名)</span>}
      </h1>
      <Link href="/company/talents" className="text-sm font-medium text-[#2979ff] hover:underline">
        人材を探す →
      </Link>
    </div>
  );
}

// ── Card (Left Panel) ──
function CandidateCard({
  user: u,
  isSelected,
  onSelect,
  onUnsave,
}: {
  user: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  onUnsave: () => void;
}) {
  const initials = u.name
    .split(/\s/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  const avatarBg = u.profileColor ?? "#94a3b8";
  const recentExps = u.experiences.slice(0, 2);
  const topSkills = u.skills.slice(0, 4);
  const extraSkillCount = u.skills.length - 4;

  const inner = (
    <div
      className={`rounded-xl px-4 py-3.5 transition-all ${
        isSelected
          ? "bg-white ring-1 ring-blue-200 shadow-sm"
          : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
      }`}
    >
      <div className="flex items-center gap-3.5">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[17px] font-semibold truncate ${isSelected ? "text-gray-900" : "text-gray-800"}`}
          >
            {u.name}
          </p>
          {u.headline && <p className="text-[15px] text-gray-500 truncate mt-0.5">{u.headline}</p>}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnsave();
          }}
          className="shrink-0 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer group"
          title="保存を解除"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="#2979ff"
            stroke="#2979ff"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:fill-red-400 group-hover:stroke-red-400 transition-colors"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {recentExps.length > 0 && (
        <div className="mt-3 space-y-1">
          {recentExps.map((exp, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
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
                <span className="text-gray-700 font-medium">{exp.companyName}</span>
                <span className="text-gray-300 mx-1.5">—</span>
                <span className="text-gray-500">{exp.title}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {topSkills.map((s) => (
          <span
            key={s}
            className="rounded-md bg-gray-100 px-2.5 py-1 text-[13px] font-medium text-gray-600 leading-none"
          >
            {s}
          </span>
        ))}
        {extraSkillCount > 0 && (
          <span className="text-[13px] text-gray-400 leading-none">+{extraSkillCount}</span>
        )}
        {u.jobSeekingStatus && topSkills.length > 0 && (
          <span className="text-gray-200 text-[13px]">|</span>
        )}
        {u.jobSeekingStatus && <SeekingDot status={u.jobSeekingStatus} />}
      </div>
    </div>
  );

  return (
    <>
      <Link href={`/profile/${u.username}`} className="lg:hidden block">
        {inner}
      </Link>
      <button
        type="button"
        onClick={onSelect}
        className="hidden lg:block w-full text-left cursor-pointer"
      >
        {inner}
      </button>
    </>
  );
}

// ── Detail (Right Panel) ──
function CandidateDetail({
  user: u,
  wvScores,
  ciScores,
  loading,
  allExperiences,
  allSkills,
  about,
  onUnsave,
}: {
  user: Candidate;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
  loading: boolean;
  allExperiences: {
    companyName: string;
    title: string;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
    isCurrent: boolean;
    description?: string;
  }[];
  allSkills: string[];
  about: string | null;
  onUnsave: () => void;
}) {
  const initials = u.name
    .split(/\s/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  const avatarBg = u.profileColor ?? "#94a3b8";
  const status = u.jobSeekingStatus ? SEEKING_STATUS_MAP[u.jobSeekingStatus] : null;
  const experiences =
    allExperiences.length > 0
      ? allExperiences
      : u.experiences.map((e) => ({
          companyName: e.companyName,
          title: e.title,
          startYear: 0,
          startMonth: 0,
          endYear: null as number | null,
          endMonth: null as number | null,
          isCurrent: false,
          description: undefined as string | undefined,
        }));
  const skillList = allSkills.length > 0 ? allSkills : u.skills;
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const aboutNeedsExpand = about ? about.length > 200 : false;

  return (
    <div className="flex-1 p-8 space-y-0">
      {/* Header */}
      <div className="flex items-start gap-4 pb-6">
        {u.avatarUrl ? (
          <img
            src={u.avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">{u.name}</h2>
            {status && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${u.jobSeekingStatus === "active" ? "bg-emerald-400" : u.jobSeekingStatus === "open" ? "bg-amber-400" : "bg-gray-300"}`}
                />
                {status.label}
              </span>
            )}
          </div>
          {u.headline && <p className="text-sm text-gray-500 mt-1">{u.headline}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onUnsave}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="#2979ff"
              stroke="#2979ff"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            保存を解除
          </button>
          <Link
            href={`/company/scout/send?userId=${u.userId}&username=${u.username}`}
            className="rounded-lg border border-[#2979ff] bg-[#2979ff] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            スカウトを送る
          </Link>
          <Link
            href={`/profile/${u.username}`}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            プロフィール →
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* About */}
      {about && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            自己紹介
          </h3>
          <p
            className={`text-sm text-gray-600 whitespace-pre-line leading-relaxed ${!aboutExpanded && aboutNeedsExpand ? "line-clamp-3" : ""}`}
          >
            {about}
          </p>
          {aboutNeedsExpand && (
            <button
              type="button"
              onClick={() => setAboutExpanded(!aboutExpanded)}
              className="text-xs text-blue-500 hover:text-blue-600 mt-1 cursor-pointer"
            >
              {aboutExpanded ? "閉じる" : "もっと見る"}
            </button>
          )}
        </div>
      )}
      {about && <div className="border-t border-gray-100" />}

      {/* Experiences */}
      {experiences.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            職歴
          </h3>
          <div className="space-y-0">
            {experiences.map((exp, i) => (
              <div key={i} className="flex gap-3 group">
                <div className="flex flex-col items-center w-4 shrink-0">
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${exp.isCurrent ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white group-hover:border-gray-400"}`}
                  />
                  {i < experiences.length - 1 && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-gray-900">{exp.title}</p>
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
      )}
      {experiences.length > 0 && <div className="border-t border-gray-100" />}

      {/* Skills */}
      {skillList.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            スキル
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skillList.map((s) => (
              <span
                key={s}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {skillList.length > 0 && <div className="border-t border-gray-100" />}

      {/* Diagnostics */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            診断結果
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">価値観（Work Values）</h4>
              {wvScores ? (
                <SingleRadarChart
                  scores={wvScores}
                  order={WV_ORDER}
                  fullLabels={WV_FULL_LABELS}
                  isWV={true}
                />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  未受験
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">適職（Career Interest）</h4>
              {ciScores ? (
                <SingleRadarChart
                  scores={ciScores}
                  order={CI_ORDER}
                  fullLabels={CI_FULL_LABELS}
                  isWV={false}
                />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  未受験
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──
function SeekingDot({ status }: { status: string }) {
  const cfg = SEEKING_STATUS_MAP[status];
  if (!cfg) return null;
  const dotColor =
    status === "active" ? "bg-emerald-400" : status === "open" ? "bg-amber-400" : "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className={`text-[13px] leading-none ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
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
