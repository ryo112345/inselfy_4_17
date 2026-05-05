"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import { SingleRadarChart, WV_ORDER, WV_FULL_LABELS, CI_ORDER, CI_FULL_LABELS } from "@/app/components/SingleRadarChart";

type TalentCard = {
  user_id: string;
  username: string;
  name: string;
  headline: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  job_seeking_status: string | null;
  skills: string[];
  experiences: { company_name: string; title: string }[];
  top_wv_labels: string[];
  top_ci_labels: string[];
  similarity?: number;
  wv_similarity?: number;
  ci_similarity?: number;
  integrated_similarity?: number;
};

type Team = {
  id: string;
  name: string;
};

const SEEKING_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  actively_looking:  { label: "積極的に探している", bg: "bg-emerald-50", text: "text-emerald-700" },
  open:              { label: "良い話があれば", bg: "bg-amber-50", text: "text-amber-700" },
  not_looking:       { label: "今は探していない", bg: "bg-gray-100", text: "text-gray-500" },
};

const VALUE_LABELS: Record<string, string> = {
  achievement: "達成",
  comfort: "快適さ",
  status: "地位",
  altruism: "利他",
  safety: "安全",
  autonomy: "自律",
};

const CI_TYPE_LABELS: Record<string, string> = {
  R: "現実的",
  I: "研究的",
  A: "芸術的",
  S: "社会的",
  E: "企業的",
  C: "慣習的",
};

export default function TalentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { companyFetch } = useCompanyAuth();

  const initialTab = searchParams.get("tab") === "diagnostic" ? "diagnostic" : "condition";
  const initialTeamId = searchParams.get("team") ?? "";

  const [tab, setTab] = useState<"condition" | "diagnostic">(initialTab);
  const [users, setUsers] = useState<TalentCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const PAGE_SIZE = 20;

  // Condition filters — restore from URL
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(() => {
    const s = searchParams.get("skills");
    return s ? s.split(",").filter(Boolean) : [];
  });
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [industry, setIndustry] = useState(searchParams.get("industry") ?? "");
  const [seekingStatus, setSeekingStatus] = useState(searchParams.get("job_seeking_status") ?? "");
  const [jobType, setJobType] = useState(searchParams.get("job_type") ?? "");

  // Detail panel (diagnostic split view)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get("selected") ?? null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPanelRef = useRef<HTMLDivElement>(null);
  const [detailWv, setDetailWv] = useState<{ id: string; score: number }[] | null>(null);
  const [detailCi, setDetailCi] = useState<{ id: string; score: number }[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExperiences, setDetailExperiences] = useState<{ companyName: string; title: string; startYear: number; startMonth: number; endYear?: number | null; endMonth?: number | null; isCurrent: boolean; description?: string }[]>([]);
  const [detailSkills, setDetailSkills] = useState<string[]>([]);
  const [detailAbout, setDetailAbout] = useState<string | null>(null);

  // Diagnostic filters — restore from URL
  const [diagnosticMode, setDiagnosticMode] = useState<"team" | "custom">(() => {
    const m = searchParams.get("mode");
    return m === "custom" ? "custom" : "team";
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = { achievement: 50, comfort: 50, status: 50, altruism: 50, safety: 50, autonomy: 50 };
    for (const k of Object.keys(defaults)) {
      const v = searchParams.get(`wv_${k}`);
      if (v) defaults[k] = Number(v);
    }
    return defaults;
  });
  const [diagnosticType, setDiagnosticType] = useState<"wv" | "ci" | "integrated">(() => {
    const dt = searchParams.get("dtype");
    if (dt === "ci" || dt === "integrated") return dt;
    return "wv";
  });
  const [customCIWeights, setCustomCIWeights] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    for (const k of Object.keys(defaults)) {
      const v = searchParams.get(`ci_${k}`);
      if (v) defaults[k] = Number(v);
    }
    return defaults;
  });

  // Team average scores for compare overlay
  const [teamWvAvg, setTeamWvAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamCiAvg, setTeamCiAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    companyFetch("/api/company/teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => {});
  }, [companyFetch]);

  // Fetch team scores for comparison overlay
  useEffect(() => {
    if (!selectedTeamId || diagnosticMode !== "team") {
      setTeamWvAvg(null);
      setTeamCiAvg(null);
      setTeamName("");
      return;
    }
    const team = teams.find((t) => t.id === selectedTeamId);
    setTeamName(team?.name ?? "チーム");

    companyFetch(`/api/company/teams/${selectedTeamId}/scores`)
      .then((r) => r.json())
      .then((data) => {
        const members: { wv_scores?: { id: string; display_score: number }[]; ci_scores?: { id: string; display_score: number }[] }[] = data.members ?? [];
        // Compute WV averages
        const wvAccum: Record<string, { sum: number; count: number }> = {};
        const ciAccum: Record<string, { sum: number; count: number }> = {};
        for (const m of members) {
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
      })
      .catch(() => {
        setTeamWvAvg(null);
        setTeamCiAvg(null);
      });
  }, [selectedTeamId, diagnosticMode, teams, companyFetch]);

  // Effective compare scores: from team averages or custom weights
  const compareWv = useMemo(() => {
    if (diagnosticMode === "team") return teamWvAvg;
    if (diagnosticType === "wv" || diagnosticType === "integrated") {
      return Object.entries(customWeights).map(([id, score]) => ({ id, score }));
    }
    return null;
  }, [diagnosticMode, diagnosticType, teamWvAvg, customWeights]);

  const compareCi = useMemo(() => {
    if (diagnosticMode === "team") return teamCiAvg;
    if (diagnosticType === "ci" || diagnosticType === "integrated") {
      // Convert 0-100 slider to 1-5 RIASEC scale for the radar chart
      return Object.entries(customCIWeights).map(([id, score]) => ({ id, score: 1 + (score / 100) * 4 }));
    }
    return null;
  }, [diagnosticMode, diagnosticType, teamCiAvg, customCIWeights]);

  const compareDisplayLabel = diagnosticMode === "team" ? teamName : "目標値";

  // Detect when split panel becomes sticky (header/search scrolled out of view)
  const panelStuckRef = useRef(false);
  useEffect(() => {
    const panel = splitPanelRef.current;
    if (!panel) return;
    const checkStuck = () => {
      const rect = panel.getBoundingClientRect();
      const stuck = rect.top <= 29;
      if (stuck !== panelStuckRef.current) {
        panelStuckRef.current = stuck;
      }
    };
    window.addEventListener("scroll", checkStuck, { passive: true });
    checkStuck();
    return () => window.removeEventListener("scroll", checkStuck);
  }, [users, loading, tab]);

  // Forward wheel events to page scroll until header is hidden, then let panel scroll natively
  useEffect(() => {
    const panel = splitPanelRef.current;
    if (!panel) return;
    const handler = (e: WheelEvent) => {
      if (panelStuckRef.current) return;
      e.preventDefault();
      window.scrollTo(0, window.scrollY + e.deltaY);
    };
    panel.addEventListener("wheel", handler, { passive: false });
    return () => panel.removeEventListener("wheel", handler);
  }, [users, loading, tab]);


  // Auto-search on mount: restore from URL or from team page link
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    const wasSearched = searchParams.get("searched") === "1";
    const savedCount = sessionStorage.getItem("talents_loaded_count");
    const restoreLimit = savedCount ? Number(savedCount) : undefined;
    sessionStorage.removeItem("talents_loaded_count");

    if (initialTab === "diagnostic" && (initialTeamId || wasSearched)) {
      if (diagnosticMode === "team" && !selectedTeamId) return;
      syncFiltersToURL();
      fetchTalents(getDiagnosticEndpoint(), buildDiagnosticParams(0, restoreLimit), false);
    } else if (initialTab === "condition" && wasSearched) {
      syncFiltersToURL();
      fetchTalents("/api/company/talents/search", buildConditionParams(0, restoreLimit), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first user when diagnostic results load
  useEffect(() => {
    if (tab === "diagnostic" && users.length > 0 && (!selectedUserId || !users.some((u) => u.user_id === selectedUserId))) {
      setSelectedUserId(users[0].user_id);
    }
  }, [users, tab, selectedUserId]);

  // Fetch WV/CI scores + full experiences/skills when a user is selected in diagnostic mode
  useEffect(() => {
    if (!selectedUserId || tab !== "diagnostic") {
      setDetailWv(null);
      setDetailCi(null);
      setDetailExperiences([]);
      setDetailSkills([]);
      setDetailAbout(null);
      return;
    }
    const user = users.find((u) => u.user_id === selectedUserId);
    if (!user) return;
    setDetailLoading(true);
    Promise.all([
      fetch(`/api/work-values/users/${selectedUserId}/results/latest`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/career-interest/users/${selectedUserId}/results/latest`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/users/${user.username}/experiences`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/users/${user.username}/skills`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/users/${user.username}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([wvData, ciData, expData, skillData, profileData]) => {
        setDetailWv(
          wvData?.values?.map((v: { value_id: string; display_score: number }) => ({ id: v.value_id, score: v.display_score })) ?? null,
        );
        setDetailCi(
          ciData?.type_scores?.map((s: { type_id: string; score: number }) => ({ id: s.type_id, score: s.score })) ?? null,
        );
        setDetailExperiences(
          (expData?.items ?? []).map((e: { companyName: string; title: string; startYear: number; startMonth: number; endYear?: number | null; endMonth?: number | null; isCurrent: boolean; description?: string }) => ({
            companyName: e.companyName, title: e.title, startYear: e.startYear, startMonth: e.startMonth,
            endYear: e.endYear, endMonth: e.endMonth, isCurrent: e.isCurrent, description: e.description,
          })),
        );
        setDetailSkills((skillData?.items ?? []).map((s: { name: string }) => s.name));
        setDetailAbout(profileData?.about ?? null);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedUserId, tab, users]);

  const selectedUser = useMemo(
    () => (selectedUserId ? users.find((u) => u.user_id === selectedUserId) ?? null : null),
    [users, selectedUserId],
  );

  const buildURLParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (tab === "condition") {
      if (keyword) params.set("q", keyword);
      if (skills.length > 0) params.set("skills", skills.join(","));
      if (location) params.set("location", location);
      if (industry) params.set("industry", industry);
      if (seekingStatus) params.set("job_seeking_status", seekingStatus);
      if (jobType) params.set("job_type", jobType);
    } else {
      params.set("mode", diagnosticMode);
      params.set("dtype", diagnosticType);
      if (diagnosticMode === "team" && selectedTeamId) {
        params.set("team", selectedTeamId);
      } else if (diagnosticMode === "custom") {
        if (diagnosticType === "wv" || diagnosticType === "integrated") {
          for (const [k, v] of Object.entries(customWeights)) params.set(`wv_${k}`, String(v));
        }
        if (diagnosticType === "ci" || diagnosticType === "integrated") {
          for (const [k, v] of Object.entries(customCIWeights)) params.set(`ci_${k}`, String(v));
        }
      }
    }
    params.set("searched", "1");
    return params;
  }, [tab, keyword, skills, location, industry, seekingStatus, jobType, diagnosticMode, diagnosticType, selectedTeamId, customWeights, customCIWeights]);

  const syncFiltersToURL = useCallback((overrideSelected?: string | null) => {
    const params = buildURLParams();
    const sel = overrideSelected !== undefined ? overrideSelected : selectedUserId;
    if (sel) params.set("selected", sel);
    router.replace(`/company/talents?${params}`, { scroll: false });
  }, [buildURLParams, selectedUserId, router]);

  // Sync selectedUserId to URL when it changes (after search)
  useEffect(() => {
    if (!searched) return;
    syncFiltersToURL();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);


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
    if (users.length > PAGE_SIZE) {
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
      if (tab === "diagnostic") {
        const saved = sessionStorage.getItem("talents_scroll_left");
        if (saved && leftPanelRef.current) {
          leftPanelRef.current.scrollTop = Number(saved);
        }
      }
      const savedPage = sessionStorage.getItem("talents_scroll_page");
      if (savedPage) {
        window.scrollTo(0, Number(savedPage));
      }
      sessionStorage.removeItem("talents_scroll_left");
      sessionStorage.removeItem("talents_scroll_page");
    });
  }, [users, tab]);

  const buildConditionParams = useCallback((offset: number, limit?: number) => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (skills.length > 0) params.set("skills", skills.join(","));
    if (location) params.set("location", location);
    if (industry) params.set("industry", industry);
    if (seekingStatus) params.set("job_seeking_status", seekingStatus);
    if (jobType) params.set("job_type", jobType);
    params.set("limit", String(limit ?? PAGE_SIZE));
    params.set("offset", String(offset));
    return params;
  }, [keyword, skills, location, industry, seekingStatus, jobType]);

  const getDiagnosticEndpoint = useCallback(() => {
    switch (diagnosticType) {
      case "ci": return "/api/company/talents/search/diagnostic/ci";
      case "integrated": return "/api/company/talents/search/diagnostic/integrated";
      default: return "/api/company/talents/search/diagnostic";
    }
  }, [diagnosticType]);

  const buildDiagnosticParams = useCallback((offset: number, limit?: number) => {
    const params = new URLSearchParams();
    if (diagnosticMode === "team" && selectedTeamId) {
      params.set("team_id", selectedTeamId);
    } else if (diagnosticMode === "custom") {
      if (diagnosticType === "wv" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customWeights)) {
          params.set(`wv_${k}`, String(v));
        }
      }
      if (diagnosticType === "ci" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customCIWeights)) {
          params.set(`ci_${k}`, String(v));
        }
      }
    }
    params.set("limit", String(limit ?? PAGE_SIZE));
    params.set("offset", String(offset));
    return params;
  }, [diagnosticMode, diagnosticType, selectedTeamId, customWeights, customCIWeights]);

  const fetchTalents = useCallback(async (endpoint: string, params: URLSearchParams, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearched(true);
    }
    try {
      const res = await companyFetch(`${endpoint}?${params}`);
      const data = await res.json();
      const newUsers = data.users ?? [];
      setUsers((prev) => append ? [...prev, ...newUsers] : newUsers);
      setTotal(data.total ?? 0);
    } catch {
      if (!append) { setUsers([]); setTotal(0); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [companyFetch]);

  const handleConditionSearch = useCallback(() => {
    syncFiltersToURL();
    fetchTalents("/api/company/talents/search", buildConditionParams(0), false);
  }, [fetchTalents, buildConditionParams, syncFiltersToURL]);

  const handleDiagnosticSearch = useCallback(() => {
    if (diagnosticMode === "team" && !selectedTeamId) return;
    syncFiltersToURL();
    fetchTalents(getDiagnosticEndpoint(), buildDiagnosticParams(0), false);
  }, [fetchTalents, getDiagnosticEndpoint, buildDiagnosticParams, diagnosticMode, selectedTeamId, syncFiltersToURL]);

  const handleLoadMore = useCallback(() => {
    const offset = users.length;
    if (tab === "condition") {
      fetchTalents("/api/company/talents/search", buildConditionParams(offset), true);
    } else {
      fetchTalents(getDiagnosticEndpoint(), buildDiagnosticParams(offset), true);
    }
  }, [tab, users.length, fetchTalents, buildConditionParams, getDiagnosticEndpoint, buildDiagnosticParams]);

  const handleSearch = tab === "condition" ? handleConditionSearch : handleDiagnosticSearch;

  const hasMore = users.length > 0 && users.length < total;
  const pageSentinelObserver = useRef<IntersectionObserver | null>(null);
  const panelSentinelObserver = useRef<IntersectionObserver | null>(null);

  const pageSentinelRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      if (pageSentinelObserver.current) pageSentinelObserver.current.disconnect();
      if (!node || !hasMore) return;
      pageSentinelObserver.current = new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting && !loadingMore) handleLoadMore(); },
        { rootMargin: "200px" },
      );
      pageSentinelObserver.current.observe(node);
    },
    [hasMore, loadingMore, handleLoadMore],
  );

  const panelSentinelRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      if (panelSentinelObserver.current) panelSentinelObserver.current.disconnect();
      if (!node || !hasMore) return;
      const scrollParent = node.closest(".overflow-y-auto");
      panelSentinelObserver.current = new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting && !loadingMore) handleLoadMore(); },
        { root: scrollParent, rootMargin: "200px" },
      );
      panelSentinelObserver.current.observe(node);
    },
    [hasMore, loadingMore, handleLoadMore],
  );

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const switchTab = (t: "condition" | "diagnostic") => {
    setTab(t);
    setUsers([]);
    setTotal(0);
    setSearched(false);
    setSelectedUserId(null);
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    if (t !== "diagnostic") params.delete("team");
    router.replace(`/company/talents?${params}`, { scroll: false });
  };

  const accentColor = "#2979ff";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">人材を探す</h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => switchTab("condition")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              tab === "condition" ? "text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
            style={tab === "condition" ? { backgroundColor: accentColor } : {}}
          >
            条件検索
          </button>
          <button
            onClick={() => switchTab("diagnostic")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              tab === "diagnostic" ? "text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
            style={tab === "diagnostic" ? { backgroundColor: accentColor } : {}}
          >
            診断検索
          </button>
        </div>
      </div>

      {/* Condition Search Filters */}
      {tab === "condition" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4">
          <div className="space-y-2.5">
            {/* Keyword + Skills row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="キーワード（名前・肩書き・自己紹介）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="スキル追加"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                  }}
                  className="w-32 rounded-lg border border-gray-200 py-1.5 px-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
                />
                <button
                  onClick={addSkill}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  追加
                </button>
              </div>
            </div>

            {/* Skills chips */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                  >
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setSkills([])}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  クリア
                </button>
              </div>
            )}

            {/* Dropdowns + search button row */}
            <div className="flex items-center gap-2">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">勤務地</option>
                <option value="東京">東京</option>
                <option value="大阪">大阪</option>
                <option value="名古屋">名古屋</option>
                <option value="福岡">福岡</option>
                <option value="リモート">リモート</option>
              </select>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">業界</option>
                <option value="IT">IT</option>
                <option value="金融">金融</option>
                <option value="製造">製造</option>
                <option value="コンサルティング">コンサルティング</option>
                <option value="医療">医療</option>
              </select>
              <select
                value={seekingStatus}
                onChange={(e) => setSeekingStatus(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">転職意欲</option>
                <option value="actively_looking">積極的に探している</option>
                <option value="open">良い話があれば</option>
                <option value="not_looking">今は探していない</option>
              </select>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">職種</option>
                <option value="エンジニア">エンジニア</option>
                <option value="デザイナー">デザイナー</option>
                <option value="PM">PM</option>
                <option value="営業">営業</option>
                <option value="マーケティング">マーケティング</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer ml-auto"
                style={{ backgroundColor: accentColor }}
              >
                {loading ? "検索中..." : "検索する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Search Filters */}
      {tab === "diagnostic" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4">
          {/* Toolbar row: type tabs + mode + team/custom selector + search button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
              {([["wv", "Work Values"], ["ci", "Career Interest"], ["integrated", "総合"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDiagnosticType(key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    diagnosticType === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-gray-200" />

            <select
              value={diagnosticMode}
              onChange={(e) => setDiagnosticMode(e.target.value as "team" | "custom")}
              className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="team">チームから選択</option>
              <option value="custom">カスタム設定</option>
            </select>

            {diagnosticMode === "team" && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer min-w-[160px]"
              >
                <option value="">チームを選択</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleSearch}
              disabled={loading || (diagnosticMode === "team" && !selectedTeamId)}
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer ml-auto"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? "検索中..." : "マッチング検索"}
            </button>
          </div>

          {/* Custom sliders (only shown in custom mode) */}
          {diagnosticMode === "custom" && (diagnosticType === "wv" || diagnosticType === "integrated") && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {diagnosticType === "integrated" && (
                <p className="text-[11px] font-medium text-gray-500 mb-2">Work Values</p>
              )}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5">
                {Object.entries(VALUE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-gray-600 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={customWeights[key]}
                      onChange={(e) => setCustomWeights({ ...customWeights, [key]: Number(e.target.value) })}
                      className="flex-1 accent-blue-600 cursor-pointer h-4"
                    />
                    <span className="w-6 text-right text-xs font-mono text-gray-400">{customWeights[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagnosticMode === "custom" && (diagnosticType === "ci" || diagnosticType === "integrated") && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {diagnosticType === "integrated" && (
                <p className="text-[11px] font-medium text-gray-500 mb-2">Career Interest</p>
              )}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5">
                {Object.entries(CI_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-gray-600 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={customCIWeights[key]}
                      onChange={(e) => setCustomCIWeights({ ...customCIWeights, [key]: Number(e.target.value) })}
                      className="flex-1 accent-purple-600 cursor-pointer h-4"
                    />
                    <span className="w-6 text-right text-xs font-mono text-gray-400">{customCIWeights[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Loading skeleton (condition tab) */}
      {loading && tab === "condition" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-48 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-gray-100 mb-2" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton (diagnostic tab) */}
      {loading && tab === "diagnostic" && (
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

      {/* Condition tab: grid layout */}
      {!loading && tab === "condition" && users.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <CandidateCard key={u.user_id} user={u} showSimilarity={false} />
            ))}
          </div>
          {hasMore && (
            <div ref={pageSentinelRef} className="flex justify-center mt-6 py-4">
              {loadingMore && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              )}
            </div>
          )}
        </>
      )}

      {/* Diagnostic tab: split layout — sticky full-width panel */}
      {!loading && tab === "diagnostic" && users.length > 0 && (
        <div
          ref={splitPanelRef}
          data-testid="diagnostic-split-panel"
          className="sticky top-[28px] ml-[50%] -translate-x-1/2 flex border-t border-gray-200 bg-white overflow-clip"
          style={{ width: "calc(100vw - 48px)", height: "calc(100vh - 28px)" }}
        >
          {/* Left Panel - candidate list */}
          <div ref={leftPanelRef} className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 bg-gray-50/60 overflow-y-auto">
            <ul className="p-2 space-y-1">
              {users.map((u) => (
                <li key={u.user_id}>
                  <DiagnosticCandidateCard
                    user={u}
                    isSelected={selectedUserId === u.user_id}
                    onSelect={() => setSelectedUserId(u.user_id)}
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
          <div className="hidden lg:flex flex-1 min-h-0 bg-gray-50/50 overflow-y-auto">
            {selectedUser ? (
              <CandidateDetail
                user={selectedUser}
                wvScores={detailWv}
                ciScores={detailCi}
                loading={detailLoading}
                compareWv={compareWv}
                compareCi={compareCi}
                compareLabel={compareDisplayLabel}
                allExperiences={detailExperiences}
                allSkills={detailSkills}
                about={detailAbout}
                diagnosticType={diagnosticType}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
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
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
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

function CandidateCard({ user: u, showSimilarity }: { user: TalentCard; showSimilarity: boolean }) {
  const status = u.job_seeking_status ? SEEKING_STATUS_MAP[u.job_seeking_status] : null;

  const initials = u.name
    .split(/\s/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  const avatarBg = u.profile_color ?? "#94a3b8";

  return (
    <Link
      href={`/profile/${u.username}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {u.name}
            </p>
            {u.headline && (
              <p className="text-xs text-gray-500 truncate">{u.headline}</p>
            )}
          </div>
        </div>

        {showSimilarity && u.similarity != null && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: u.similarity >= 80 ? "#2979ff" : u.similarity >= 60 ? "#64b5f6" : "#9ca3af" }}
          >
            {Math.round(u.similarity)}%
          </span>
        )}
      </div>

      {/* Experiences */}
      {u.experiences.length > 0 && (
        <div className="mb-3 space-y-1">
          {u.experiences.map((exp, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="shrink-0 text-gray-400" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <span className="truncate">{exp.company_name}</span>
              <span className="text-gray-300">·</span>
              <span className="truncate text-gray-500">{exp.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {u.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {u.skills.map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: status + diagnostic labels */}
      <div className="flex items-center gap-2 flex-wrap">
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        )}
        {u.top_wv_labels.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
            WV: {u.top_wv_labels.join("・")}
          </span>
        )}
        {u.top_ci_labels.length > 0 && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
            CI: {u.top_ci_labels.join("・")}
          </span>
        )}
      </div>
    </Link>
  );
}

function SimilarityRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;
  const color = value >= 80 ? "#2563eb" : value >= 60 ? "#60a5fa" : "#d1d5db";
  const bgColor = value >= 80 ? "#dbeafe" : value >= 60 ? "#eff6ff" : "#f9fafb";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill={bgColor} stroke="#e5e7eb" strokeWidth={2.5} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={circumference} strokeDashoffset={circumference - filled}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700">{Math.round(value)}</span>
      </div>
    </div>
  );
}

function SeekingDot({ status }: { status: string }) {
  const cfg = SEEKING_STATUS_MAP[status];
  if (!cfg) return null;
  const dotColor = status === "actively_looking" ? "bg-emerald-400" : status === "open" ? "bg-amber-400" : "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className={`text-[10px] leading-none ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}

function DiagnosticCandidateCard({
  user: u,
  isSelected,
  onSelect,
}: {
  user: TalentCard;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const initials = u.name.split(/\s/).map((s) => s[0]).join("").slice(0, 2);
  const avatarBg = u.profile_color ?? "#94a3b8";
  const recentExps = u.experiences.slice(0, 2);
  const topSkills = u.skills.slice(0, 3);
  const extraSkillCount = u.skills.length - 3;

  const inner = (
    <div
      className={`rounded-xl p-3 transition-all ${
        isSelected
          ? "bg-white ring-1 ring-blue-200 shadow-sm"
          : "hover:bg-white/60"
      }`}
    >
      <div className="flex gap-3">
        {/* Match ring */}
        {u.similarity != null && <SimilarityRing value={u.similarity} />}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                style={{ backgroundColor: avatarBg }}
              >
                {initials}
              </div>
            )}
            <p className={`text-[13px] font-semibold truncate ${isSelected ? "text-gray-900" : "text-gray-800"}`}>
              {u.name}
            </p>
          </div>

          {/* Experiences */}
          {recentExps.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {recentExps.map((exp, i) => (
                <p key={i} className="text-[11px] leading-snug truncate">
                  <span className="text-gray-700 font-medium">{exp.company_name}</span>
                  <span className="text-gray-300 mx-1">—</span>
                  <span className="text-gray-500">{exp.title}</span>
                </p>
              ))}
            </div>
          )}

          {/* Skills + Status row */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {topSkills.map((s) => (
              <span key={s} className="rounded-md bg-gray-100 px-1.5 py-[3px] text-[10px] font-medium text-gray-600 leading-none">
                {s}
              </span>
            ))}
            {extraSkillCount > 0 && (
              <span className="text-[10px] text-gray-400 leading-none">+{extraSkillCount}</span>
            )}
            {u.job_seeking_status && topSkills.length > 0 && (
              <span className="text-gray-200 text-[10px]">|</span>
            )}
            {u.job_seeking_status && <SeekingDot status={u.job_seeking_status} />}
          </div>
        </div>
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

function matchColor(v: number) {
  return v >= 80 ? "#2563eb" : v >= 60 ? "#60a5fa" : "#9ca3af";
}

function MatchBadges({ user: u, diagnosticType }: { user: TalentCard; diagnosticType: "wv" | "ci" | "integrated" }) {
  type Entry = { label: string; value: number; primary: boolean };
  const entries: Entry[] = [];

  if (diagnosticType === "wv") {
    if (u.wv_similarity != null) entries.push({ label: "価値観", value: u.wv_similarity, primary: true });
    if (u.ci_similarity != null) entries.push({ label: "適職", value: u.ci_similarity, primary: false });
    if (u.integrated_similarity != null) entries.push({ label: "総合", value: u.integrated_similarity, primary: false });
  } else if (diagnosticType === "ci") {
    if (u.ci_similarity != null) entries.push({ label: "適職", value: u.ci_similarity, primary: true });
    if (u.wv_similarity != null) entries.push({ label: "価値観", value: u.wv_similarity, primary: false });
    if (u.integrated_similarity != null) entries.push({ label: "総合", value: u.integrated_similarity, primary: false });
  } else {
    if (u.integrated_similarity != null) entries.push({ label: "総合", value: u.integrated_similarity, primary: true });
    if (u.wv_similarity != null) entries.push({ label: "価値観", value: u.wv_similarity, primary: false });
    if (u.ci_similarity != null) entries.push({ label: "適職", value: u.ci_similarity, primary: false });
  }

  if (entries.length === 0 && u.similarity != null) {
    const label = diagnosticType === "wv" ? "価値観" : diagnosticType === "ci" ? "適職" : "総合";
    entries.push({ label, value: u.similarity, primary: true });
  }

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {entries.map((e) => (
        <span
          key={e.label}
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold leading-snug ${
            e.primary ? "text-white" : "bg-gray-100 text-gray-600"
          }`}
          style={e.primary ? { backgroundColor: matchColor(e.value) } : undefined}
        >
          {e.label} {Math.round(e.value)}%
        </span>
      ))}
    </div>
  );
}

function formatPeriod(startYear: number, startMonth: number, endYear?: number | null, endMonth?: number | null, isCurrent?: boolean) {
  const start = `${startYear}年${startMonth}月`;
  if (isCurrent) return `${start} — 現在`;
  if (endYear && endMonth) return `${start} — ${endYear}年${endMonth}月`;
  return start;
}

function CandidateDetail({
  user: u,
  wvScores,
  ciScores,
  loading,
  compareWv,
  compareCi,
  compareLabel,
  allExperiences,
  allSkills,
  about,
  diagnosticType,
}: {
  user: TalentCard;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
  loading: boolean;
  compareWv?: { id: string; score: number }[] | null;
  compareCi?: { id: string; score: number }[] | null;
  compareLabel?: string;
  allExperiences: { companyName: string; title: string; startYear: number; startMonth: number; endYear?: number | null; endMonth?: number | null; isCurrent: boolean; description?: string }[];
  allSkills: string[];
  about: string | null;
  diagnosticType: "wv" | "ci" | "integrated";
}) {
  const initials = u.name.split(/\s/).map((s) => s[0]).join("").slice(0, 2);
  const avatarBg = u.profile_color ?? "#94a3b8";
  const status = u.job_seeking_status ? SEEKING_STATUS_MAP[u.job_seeking_status] : null;

  const experiences = allExperiences.length > 0 ? allExperiences : u.experiences.map((e) => ({ companyName: e.company_name, title: e.title, startYear: 0, startMonth: 0, endYear: null as number | null, endMonth: null as number | null, isCurrent: false, description: undefined as string | undefined }));
  const skillList = allSkills.length > 0 ? allSkills : u.skills;

  const [aboutExpanded, setAboutExpanded] = useState(false);
  const aboutNeedsExpand = about ? about.length > 200 : false;

  return (
    <div className="flex-1 p-8 space-y-0">
      {/* ── Header ── */}
      <div className="flex items-start gap-4 pb-6">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm" />
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
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  u.job_seeking_status === "actively_looking" ? "bg-emerald-400" : u.job_seeking_status === "open" ? "bg-amber-400" : "bg-gray-300"
                }`} />
                {status.label}
              </span>
            )}
          </div>
          {u.headline && <p className="text-sm text-gray-500 mt-1">{u.headline}</p>}
          <div className="flex items-center gap-1.5 mt-2.5">
            <MatchBadges user={u} diagnosticType={diagnosticType} />
          </div>
        </div>
        <Link
          href={`/profile/${u.username}`}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          プロフィール →
        </Link>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── About ── */}
      {about && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">自己紹介</h3>
          <p className={`text-sm text-gray-600 whitespace-pre-line leading-relaxed ${!aboutExpanded && aboutNeedsExpand ? "line-clamp-3" : ""}`}>
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

      {/* ── Experiences ── */}
      {experiences.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">職歴</h3>
          <div className="space-y-0">
            {experiences.map((exp, i) => (
              <div key={i} className="flex gap-3 group">
                <div className="flex flex-col items-center w-4 shrink-0">
                  <div className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${
                    exp.isCurrent
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 bg-white group-hover:border-gray-400"
                  }`} />
                  {i < experiences.length - 1 && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-gray-900">{exp.title}</p>
                    {exp.isCurrent && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 leading-none">現職</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{exp.companyName}</p>
                  {exp.startYear > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPeriod(exp.startYear, exp.startMonth, exp.endYear, exp.endMonth, exp.isCurrent)}
                    </p>
                  )}
                  {exp.description && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{exp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {experiences.length > 0 && <div className="border-t border-gray-100" />}

      {/* ── Skills ── */}
      {skillList.length > 0 && (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">スキル</h3>
          <div className="flex flex-wrap gap-1.5">
            {skillList.map((s) => (
              <span key={s} className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {skillList.length > 0 && <div className="border-t border-gray-100" />}

      {/* ── Diagnostic Charts ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : (
        <div className="py-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">診断結果</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-700">Work Values</h4>
                {u.wv_similarity != null && (
                  <span className="text-xs text-gray-400">{Math.round(u.wv_similarity)}% match</span>
                )}
              </div>
              {wvScores ? (
                <SingleRadarChart scores={wvScores} order={WV_ORDER} fullLabels={WV_FULL_LABELS} isWV={true} compareScores={compareWv} compareLabel={compareLabel} />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">未受験</div>
              )}
            </div>
            <div className="rounded-xl border border-gray-150 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-700">Career Interest</h4>
                {u.ci_similarity != null && (
                  <span className="text-xs text-gray-400">{Math.round(u.ci_similarity)}% match</span>
                )}
              </div>
              {ciScores ? (
                <SingleRadarChart scores={ciScores} order={CI_ORDER} fullLabels={CI_FULL_LABELS} isWV={false} compareScores={compareCi} compareLabel={compareLabel} />
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">未受験</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
