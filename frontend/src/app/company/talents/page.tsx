"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SingleRadarChart, WV_ORDER, WV_FULL_LABELS, CI_ORDER, CI_FULL_LABELS } from "@/app/components/SingleRadarChart";
import { PREFECTURES, INDUSTRIES, JOB_TYPE_GROUPS } from "@/constants/profile-options";
import {
  bulkCheckSaved,
  fetchCandidateDetail,
  fetchCompanyTeams,
  fetchTeamScoreAverages,
  saveCandidate,
  searchTalents,
  unsaveCandidate,
  type CandidateExperience,
  type TalentCard,
  type TalentSearchKind,
} from "@/features/talent-search/api";

type Team = {
  id: string;
  name: string;
};

const SEEKING_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active:       { label: "スカウト歓迎", bg: "bg-emerald-50", text: "text-emerald-700" },
  open:         { label: "いい話があれば", bg: "bg-amber-50", text: "text-amber-700" },
  not_seeking:  { label: "スカウト不要", bg: "bg-gray-100", text: "text-gray-500" },
};

const VALUE_LABELS: Record<string, string> = {
  achievement: "達成",
  status: "地位名声",
  autonomy: "自主性",
  safety: "支援",
  altruism: "人間関係",
  comfort: "労働条件",
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

  const initialTeamId = searchParams.get("team") ?? "";

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
  const [diagnosedOnly, setDiagnosedOnly] = useState(searchParams.get("diagnosed") === "1");

  // Detail panel (diagnostic split view)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get("selected") ?? null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPanelRef = useRef<HTMLDivElement>(null);
  const [detailWv, setDetailWv] = useState<{ id: string; score: number }[] | null>(null);
  const [detailCi, setDetailCi] = useState<{ id: string; score: number }[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExperiences, setDetailExperiences] = useState<CandidateExperience[]>([]);
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

  // Saved candidates
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const toggleSave = useCallback(async (userId: string) => {
    const isSaved = savedSet.has(userId);
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(userId); else next.add(userId);
      return next;
    });
    try {
      await (isSaved ? unsaveCandidate(userId) : saveCandidate(userId));
    } catch {
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(userId); else next.delete(userId);
        return next;
      });
    }
  }, [savedSet]);

  // Team average scores for compare overlay
  const [teamWvAvg, setTeamWvAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamCiAvg, setTeamCiAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    fetchCompanyTeams()
      .then(setTeams)
      .catch(() => {});
  }, []);

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

    fetchTeamScoreAverages(selectedTeamId)
      .then(({ wvAvg, ciAvg }) => {
        setTeamWvAvg(wvAvg);
        setTeamCiAvg(ciAvg);
      })
      .catch(() => {
        setTeamWvAvg(null);
        setTeamCiAvg(null);
      });
  }, [selectedTeamId, diagnosticMode, teams]);

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
  useEffect(() => {
    const panel = splitPanelRef.current;
    if (!panel) return;
    const findScrollParent = (target: EventTarget | null): HTMLElement | null => {
      let el = target as HTMLElement | null;
      while (el && el !== panel) {
        if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "hidden") return el;
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


  // Auto-search on mount: restore from URL or from team page link
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    const wasSearched = searchParams.get("searched") === "1";
    const savedCount = sessionStorage.getItem("talents_loaded_count");
    const restoreLimit = savedCount ? Number(savedCount) : undefined;
    sessionStorage.removeItem("talents_loaded_count");

    if (initialTeamId || wasSearched) {
      if (diagnosticMode === "team" && !selectedTeamId) return;
      syncFiltersToURL();
      fetchTalents(diagnosticType, buildDiagnosticParams(0, restoreLimit), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first user when results load
  useEffect(() => {
    if (users.length > 0 && (!selectedUserId || !users.some((u) => u.user_id === selectedUserId))) {
      setSelectedUserId(users[0].user_id);
    }
  }, [users, selectedUserId]);

  // Fetch WV/CI scores + full experiences/skills when a user is selected
  useEffect(() => {
    if (!selectedUserId) {
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
    fetchCandidateDetail(user.username, selectedUserId)
      .then((detail) => {
        setDetailWv(detail.wvScores);
        setDetailCi(detail.ciScores);
        setDetailExperiences(detail.experiences);
        setDetailSkills(detail.skills);
        setDetailAbout(detail.about);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedUserId, users]);

  const selectedUser = useMemo(
    () => (selectedUserId ? users.find((u) => u.user_id === selectedUserId) ?? null : null),
    [users, selectedUserId],
  );

  const buildURLParams = useCallback(() => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (skills.length > 0) params.set("skills", skills.join(","));
    if (location) params.set("location", location);
    if (industry) params.set("industry", industry);
    if (seekingStatus) params.set("job_seeking_status", seekingStatus);
    if (jobType) params.set("job_type", jobType);
    if (diagnosedOnly) params.set("diagnosed", "1");
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
    params.set("searched", "1");
    return params;
  }, [keyword, skills, location, industry, seekingStatus, jobType, diagnosedOnly, diagnosticMode, diagnosticType, selectedTeamId, customWeights, customCIWeights]);

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

  const buildDiagnosticParams = useCallback((offset: number, limit?: number) => {
    const params: Record<string, string> = {};
    if (diagnosticMode === "team" && selectedTeamId) {
      params.team_id = selectedTeamId;
    } else if (diagnosticMode === "custom") {
      if (diagnosticType === "wv" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customWeights)) {
          params[`wv_${k}`] = String(v);
        }
      }
      if (diagnosticType === "ci" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customCIWeights)) {
          params[`ci_${k}`] = String(v);
        }
      }
    }
    if (keyword) params.q = keyword;
    if (skills.length > 0) params.skills = skills.join(",");
    if (location) params.location = location;
    if (industry) params.industry = industry;
    if (seekingStatus) params.job_seeking_status = seekingStatus;
    if (jobType) params.job_type = jobType;
    if (diagnosedOnly) params.diagnosed = "1";
    params.limit = String(limit ?? PAGE_SIZE);
    params.offset = String(offset);
    return params;
  }, [diagnosticMode, diagnosticType, selectedTeamId, customWeights, customCIWeights, keyword, skills, location, industry, seekingStatus, jobType, diagnosedOnly]);

  const fetchTalents = useCallback(async (kind: TalentSearchKind, params: Record<string, string>, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearched(true);
    }
    try {
      const { users: newUsers, total } = await searchTalents(kind, params);
      setUsers((prev) => {
        if (!append) return newUsers;
        const seen = new Set(prev.map((u: TalentCard) => u.user_id));
        return [...prev, ...newUsers.filter((u: TalentCard) => !seen.has(u.user_id))];
      });
      setTotal(total);
    } catch {
      if (!append) { setUsers([]); setTotal(0); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    const ids = users.map((u) => u.user_id);
    bulkCheckSaved(ids)
      .then((saved) => {
        setSavedSet((prev) => {
          const next = new Set(prev);
          for (const [id, isSaved] of Object.entries(saved)) {
            if (isSaved) next.add(id); else next.delete(id);
          }
          return next;
        });
      })
      .catch(() => {});
  }, [users]);

  const hasDiagnosticConfig = diagnosticMode === "custom" || (diagnosticMode === "team" && !!selectedTeamId);

  const getSearchKind = useCallback((): TalentSearchKind => {
    if (!hasDiagnosticConfig) return "plain";
    return diagnosticType;
  }, [hasDiagnosticConfig, diagnosticType]);

  const buildSearchParams = useCallback((offset: number, limit?: number) => {
    if (!hasDiagnosticConfig) {
      const params: Record<string, string> = {};
      if (keyword) params.q = keyword;
      if (skills.length > 0) params.skills = skills.join(",");
      if (location) params.location = location;
      if (industry) params.industry = industry;
      if (seekingStatus) params.job_seeking_status = seekingStatus;
      if (jobType) params.job_type = jobType;
      if (diagnosedOnly) params.diagnosed = "1";
      params.limit = String(limit ?? PAGE_SIZE);
      params.offset = String(offset);
      return params;
    }
    return buildDiagnosticParams(offset, limit);
  }, [hasDiagnosticConfig, buildDiagnosticParams, keyword, skills, location, industry, seekingStatus, jobType, diagnosedOnly]);

  const handleSearch = useCallback(() => {
    syncFiltersToURL();
    fetchTalents(getSearchKind(), buildSearchParams(0), false);
  }, [fetchTalents, getSearchKind, buildSearchParams, syncFiltersToURL]);

  const handleLoadMore = useCallback(() => {
    const offset = users.length;
    fetchTalents(getSearchKind(), buildSearchParams(offset), true);
  }, [users.length, fetchTalents, getSearchKind, buildSearchParams]);

  const hasMore = users.length > 0 && users.length < total;
  const panelSentinelObserver = useRef<IntersectionObserver | null>(null);

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

  const accentColor = "#2979ff";

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">人材を探す</h1>
      </div>

      {/* ── Layer 1: Search & Condition Filters ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 mb-3 space-y-2.5">
        {/* Keyword search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="キーワードで検索（名前・肩書き・自己紹介）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                検索中
              </span>
            ) : "検索する"}
          </button>
        </div>

        {/* Filters row: dropdowns + skill input + diagnosed toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
              location ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <option value="">勤務地</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
              jobType ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <option value="">職種</option>
            {JOB_TYPE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
            ))}
            <option value="その他">その他</option>
          </select>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
              industry ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <option value="">業界</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          <select
            value={seekingStatus}
            onChange={(e) => setSeekingStatus(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
              seekingStatus ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <option value="">転職意欲</option>
            <option value="active">スカウト歓迎</option>
            <option value="open">いい話があれば</option>
            <option value="not_seeking">スカウト不要</option>
          </select>

          <div className="h-4 w-px bg-gray-200" />

          <input
            type="text"
            placeholder="スキルを追加..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addSkill(); }
            }}
            className="w-28 rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
          />

          <button
            type="button"
            onClick={() => setDiagnosedOnly(!diagnosedOnly)}
            className={`rounded-full py-1.5 px-3 text-xs font-medium transition-all cursor-pointer ${
              diagnosedOnly
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            診断済みのみ
          </button>
        </div>

        {/* Active filter chips */}
        {(skills.length > 0 || location || industry || seekingStatus || jobType || diagnosedOnly) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {skills.map((s) => (
              <button
                key={`skill-${s}`}
                onClick={() => removeSkill(s)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {s}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ))}
            {location && (
              <button
                onClick={() => setLocation("")}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {location}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {industry && (
              <button
                onClick={() => setIndustry("")}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {industry}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {seekingStatus && (
              <button
                onClick={() => setSeekingStatus("")}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {SEEKING_STATUS_MAP[seekingStatus]?.label ?? seekingStatus}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {jobType && (
              <button
                onClick={() => setJobType("")}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {jobType}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {diagnosedOnly && (
              <button
                onClick={() => setDiagnosedOnly(false)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                診断済みのみ
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => { setSkills([]); setLocation(""); setIndustry(""); setSeekingStatus(""); setJobType(""); setDiagnosedOnly(false); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
            >
              すべてクリア
            </button>
          </div>
        )}
      </div>

      {/* ── Layer 2: Diagnostic Matching (optional enhancement) ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="font-medium text-gray-700">マッチング</span>
          </div>

          <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
            {([["wv", "価値観"], ["ci", "適職"], ["integrated", "総合"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDiagnosticType(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  diagnosticType === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200" />

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
              className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer min-w-[160px] transition-colors ${
                selectedTeamId ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
              }`}
            >
              <option value="">チームを選択...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {!hasDiagnosticConfig && (
            <span className="text-[11px] text-gray-400 italic">チームまたはカスタム設定で候補者をマッチ度順に表示</span>
          )}
        </div>

        {/* Custom sliders */}
        {diagnosticMode === "custom" && (diagnosticType === "wv" || diagnosticType === "integrated") && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {diagnosticType === "integrated" && (
              <p className="text-[11px] font-medium text-gray-500 mb-2">価値観（Work Values）</p>
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
              <p className="text-[11px] font-medium text-gray-500 mb-2">適職（Career Interest）</p>
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
          <div ref={leftPanelRef} className="w-full lg:w-[520px] lg:shrink-0 lg:border-r border-gray-100 bg-gray-50/60 overflow-y-auto">
            <ul className="p-2.5 space-y-1.5">
              {users.map((u) => (
                <li key={u.user_id}>
                  <DiagnosticCandidateCard
                    user={u}
                    isSelected={selectedUserId === u.user_id}
                    onSelect={() => setSelectedUserId(u.user_id)}
                    diagnosticType={diagnosticType}
                    isSaved={savedSet.has(u.user_id)}
                    onToggleSave={() => toggleSave(u.user_id)}
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
                isSaved={savedSet.has(selectedUser.user_id)}
                onToggleSave={() => toggleSave(selectedUser.user_id)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center px-6">
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

function SaveBookmark({
  saved,
  onToggle,
  size = 16,
  showLabel = false,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
  showLabel?: boolean;
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!saved) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`shrink-0 flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${
        showLabel
          ? `border px-3.5 py-2 text-xs font-medium ${
              saved
                ? "border-blue-200 bg-blue-50 text-[#2979ff]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
            }`
          : "p-1.5 rounded-md hover:bg-gray-100"
      }`}
      title={saved ? "保存を解除" : "候補者を保存"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={saved ? "#2979ff" : "none"}
        stroke={saved ? "#2979ff" : showLabel ? "currentColor" : "#9ca3af"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animating ? "animate-[bookmark-pop_0.4s_ease-out]" : ""}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {showLabel && (saved ? "保存済み" : "保存")}
      <style>{`
        @keyframes bookmark-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </button>
  );
}

function SeekingDot({ status }: { status: string }) {
  const cfg = SEEKING_STATUS_MAP[status];
  if (!cfg) return null;
  const dotColor = status === "active" ? "bg-emerald-400" : status === "open" ? "bg-amber-400" : "bg-gray-300";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className={`text-[13px] leading-none ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}

function DiagnosticCandidateCard({
  user: u,
  isSelected,
  onSelect,
  diagnosticType,
  isSaved,
  onToggleSave,
}: {
  user: TalentCard;
  isSelected: boolean;
  onSelect: () => void;
  diagnosticType: "wv" | "ci" | "integrated";
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const initials = u.name.split(/\s/).map((s) => s[0]).join("").slice(0, 2);
  const avatarBg = u.profile_color ?? "#94a3b8";
  const recentExps = u.experiences.slice(0, 2);
  const topSkills = u.skills.slice(0, 4);
  const extraSkillCount = u.skills.length - 4;
  const wvLabels = u.top_wv_labels.slice(0, 3);
  const ciLabels = u.top_ci_labels.slice(0, 3);

  const inner = (
    <div
      className={`rounded-xl px-4 py-3.5 transition-all ${
        isSelected
          ? "bg-white ring-1 ring-blue-200 shadow-sm"
          : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200"
      }`}
    >
      {/* Row 1: Avatar + Name */}
      <div className="flex items-center gap-3.5">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[17px] font-semibold truncate ${isSelected ? "text-gray-900" : "text-gray-800"}`}>
            {u.name}
          </p>
          {u.headline && (
            <p className="text-[15px] text-gray-500 truncate mt-0.5">{u.headline}</p>
          )}
        </div>
        {onToggleSave && (
          <SaveBookmark saved={!!isSaved} onToggle={onToggleSave} size={16} />
        )}
      </div>

      {/* Row 2: Match badges */}
      <MatchBadges user={u} />

      {/* Row 2: Recent experiences (up to 2) */}
      {recentExps.length > 0 && (
        <div className="mt-3 space-y-1">
          {recentExps.map((exp, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} className="shrink-0">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <p className="text-[15px] leading-snug truncate">
                <span className="text-gray-700 font-medium">{exp.company_name}</span>
                <span className="text-gray-300 mx-1.5">—</span>
                <span className="text-gray-500">{exp.title}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Row 3: Skills + Status */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {topSkills.map((s) => (
          <span key={s} className="rounded-md bg-gray-100 px-2.5 py-1 text-[13px] font-medium text-gray-600 leading-none">
            {s}
          </span>
        ))}
        {extraSkillCount > 0 && (
          <span className="text-[13px] text-gray-400 leading-none">+{extraSkillCount}</span>
        )}
        {u.job_seeking_status && topSkills.length > 0 && (
          <span className="text-gray-200 text-[13px]">|</span>
        )}
        {u.job_seeking_status && <SeekingDot status={u.job_seeking_status} />}
      </div>

      {/* Row 4: Top diagnostic labels */}
      {(wvLabels.length > 0 || ciLabels.length > 0) && (
        <div className="mt-2.5 flex items-center gap-3 min-w-0">
          {wvLabels.length > 0 && (
            <span className="text-[13px] truncate">
              <span className="text-gray-400">価値観:</span>
              <span className="text-gray-500 ml-1">{wvLabels.join("・")}</span>
            </span>
          )}
          {ciLabels.length > 0 && (
            <span className="text-[13px] truncate">
              <span className="text-gray-400">適職:</span>
              <span className="text-gray-500 ml-1">{ciLabels.join("・")}</span>
            </span>
          )}
        </div>
      )}
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
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MatchBadges({ user: u }: { user: TalentCard }) {
  const entries: { label: string; value: number }[] = [];
  if (u.integrated_similarity != null) entries.push({ label: "総合", value: u.integrated_similarity });
  if (u.wv_similarity != null) entries.push({ label: "文化", value: u.wv_similarity });
  if (u.ci_similarity != null) entries.push({ label: "適職", value: u.ci_similarity });

  if (entries.length === 0 && u.similarity != null) {
    entries.push({ label: "総合", value: u.similarity });
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-2.5 flex items-center gap-3">
      {entries.map((e) => (
        <MatchScoreBadge key={e.label} label={e.label} value={e.value} />
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
  isSaved,
  onToggleSave,
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
  isSaved?: boolean;
  onToggleSave?: () => void;
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
                  u.job_seeking_status === "active" ? "bg-emerald-400" : u.job_seeking_status === "open" ? "bg-amber-400" : "bg-gray-300"
                }`} />
                {status.label}
              </span>
            )}
          </div>
          {u.headline && <p className="text-sm text-gray-500 mt-1">{u.headline}</p>}
          <div className="flex items-center gap-1.5 mt-2.5">
            <MatchBadges user={u} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleSave && (
            <SaveBookmark saved={!!isSaved} onToggle={onToggleSave} size={14} showLabel />
          )}
          <Link
            href={`/company/scout/send?userId=${u.user_id}&username=${u.username}`}
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
                <h4 className="text-sm font-semibold text-gray-700">価値観（Work Values）</h4>
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
                <h4 className="text-sm font-semibold text-gray-700">適職（Career Interest）</h4>
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
