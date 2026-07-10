"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bulkCheckSaved,
  fetchCompanyTeams,
  fetchTeamScoreAverages,
  saveCandidate,
  searchTalents,
  type TalentCard,
  type TalentSearchKind,
  unsaveCandidate,
} from "./api";

export type Team = {
  id: string;
  name: string;
};

export type DiagnosticMode = "team" | "custom";
export type DiagnosticType = "wv" | "ci" | "integrated";

export const TALENTS_PAGE_SIZE = 20;

/**
 * 人材検索ページの状態（検索条件・診断マッチング設定・結果・ページング・
 * URL同期・保存済み候補者）を内包するフック。挙動は分割前のページと同一。
 */
export function useTalentSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTeamId = searchParams.get("team") ?? "";

  const [users, setUsers] = useState<TalentCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

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

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    searchParams.get("selected") ?? null,
  );

  // Diagnostic filters — restore from URL
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>(() => {
    const m = searchParams.get("mode");
    return m === "custom" ? "custom" : "team";
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {
      achievement: 50,
      comfort: 50,
      status: 50,
      altruism: 50,
      safety: 50,
      autonomy: 50,
    };
    for (const k of Object.keys(defaults)) {
      const v = searchParams.get(`wv_${k}`);
      if (v) defaults[k] = Number(v);
    }
    return defaults;
  });
  const [diagnosticType, setDiagnosticType] = useState<DiagnosticType>(() => {
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

  const toggleSave = useCallback(
    async (userId: string) => {
      const isSaved = savedSet.has(userId);
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(userId);
        else next.add(userId);
        return next;
      });
      try {
        await (isSaved ? unsaveCandidate(userId) : saveCandidate(userId));
      } catch {
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (isSaved) next.add(userId);
          else next.delete(userId);
          return next;
        });
      }
    },
    [savedSet],
  );

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
      return Object.entries(customCIWeights).map(([id, score]) => ({
        id,
        score: 1 + (score / 100) * 4,
      }));
    }
    return null;
  }, [diagnosticMode, diagnosticType, teamCiAvg, customCIWeights]);

  const compareDisplayLabel = diagnosticMode === "team" ? teamName : "目標値";

  // Auto-select first user when results load
  useEffect(() => {
    if (users.length > 0 && (!selectedUserId || !users.some((u) => u.userId === selectedUserId))) {
      setSelectedUserId(users[0].userId);
    }
  }, [users, selectedUserId]);

  const selectedUser = useMemo(
    () => (selectedUserId ? (users.find((u) => u.userId === selectedUserId) ?? null) : null),
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
  }, [
    keyword,
    skills,
    location,
    industry,
    seekingStatus,
    jobType,
    diagnosedOnly,
    diagnosticMode,
    diagnosticType,
    selectedTeamId,
    customWeights,
    customCIWeights,
  ]);

  const syncFiltersToURL = useCallback(
    (overrideSelected?: string | null) => {
      const params = buildURLParams();
      const sel = overrideSelected !== undefined ? overrideSelected : selectedUserId;
      if (sel) params.set("selected", sel);
      router.replace(`/company/talents?${params}`, { scroll: false });
    },
    [buildURLParams, selectedUserId, router],
  );

  // Sync selectedUserId to URL when it changes (after search)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 検索後の selectedUserId 変更時のみ URL 同期する意図
  useEffect(() => {
    if (!searched) return;
    syncFiltersToURL();
  }, [selectedUserId]);

  const buildDiagnosticParams = useCallback(
    (offset: number, limit?: number) => {
      const params: Record<string, string> = {};
      if (diagnosticMode === "team" && selectedTeamId) {
        params.teamId = selectedTeamId;
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
      if (seekingStatus) params.jobSeekingStatus = seekingStatus;
      if (jobType) params.jobType = jobType;
      if (diagnosedOnly) params.diagnosed = "1";
      params.limit = String(limit ?? TALENTS_PAGE_SIZE);
      params.offset = String(offset);
      return params;
    },
    [
      diagnosticMode,
      diagnosticType,
      selectedTeamId,
      customWeights,
      customCIWeights,
      keyword,
      skills,
      location,
      industry,
      seekingStatus,
      jobType,
      diagnosedOnly,
    ],
  );

  const fetchTalents = useCallback(
    async (kind: TalentSearchKind, params: Record<string, string>, append: boolean) => {
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
          const seen = new Set(prev.map((u: TalentCard) => u.userId));
          return [...prev, ...newUsers.filter((u: TalentCard) => !seen.has(u.userId))];
        });
        setTotal(total);
      } catch {
        if (!append) {
          setUsers([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Auto-search on mount: restore from URL or from team page link
  const didRestoreRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: マウント時の復元処理のみ実行する意図
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
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    const ids = users.map((u) => u.userId);
    bulkCheckSaved(ids)
      .then((saved) => {
        setSavedSet((prev) => {
          const next = new Set(prev);
          for (const [id, isSaved] of Object.entries(saved)) {
            if (isSaved) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      })
      .catch(() => {});
  }, [users]);

  const hasDiagnosticConfig =
    diagnosticMode === "custom" || (diagnosticMode === "team" && !!selectedTeamId);

  const getSearchKind = useCallback((): TalentSearchKind => {
    if (!hasDiagnosticConfig) return "plain";
    return diagnosticType;
  }, [hasDiagnosticConfig, diagnosticType]);

  const buildSearchParams = useCallback(
    (offset: number, limit?: number) => {
      if (!hasDiagnosticConfig) {
        const params: Record<string, string> = {};
        if (keyword) params.q = keyword;
        if (skills.length > 0) params.skills = skills.join(",");
        if (location) params.location = location;
        if (industry) params.industry = industry;
        if (seekingStatus) params.jobSeekingStatus = seekingStatus;
        if (jobType) params.jobType = jobType;
        if (diagnosedOnly) params.diagnosed = "1";
        params.limit = String(limit ?? TALENTS_PAGE_SIZE);
        params.offset = String(offset);
        return params;
      }
      return buildDiagnosticParams(offset, limit);
    },
    [
      hasDiagnosticConfig,
      buildDiagnosticParams,
      keyword,
      skills,
      location,
      industry,
      seekingStatus,
      jobType,
      diagnosedOnly,
    ],
  );

  const handleSearch = useCallback(() => {
    syncFiltersToURL();
    fetchTalents(getSearchKind(), buildSearchParams(0), false);
  }, [fetchTalents, getSearchKind, buildSearchParams, syncFiltersToURL]);

  const handleLoadMore = useCallback(() => {
    const offset = users.length;
    fetchTalents(getSearchKind(), buildSearchParams(offset), true);
  }, [users.length, fetchTalents, getSearchKind, buildSearchParams]);

  const hasMore = users.length > 0 && users.length < total;

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  return {
    // results
    users,
    total,
    loading,
    loadingMore,
    searched,
    hasMore,
    handleSearch,
    handleLoadMore,
    // condition filters
    keyword,
    setKeyword,
    skillInput,
    setSkillInput,
    skills,
    setSkills,
    addSkill,
    removeSkill,
    location,
    setLocation,
    industry,
    setIndustry,
    seekingStatus,
    setSeekingStatus,
    jobType,
    setJobType,
    diagnosedOnly,
    setDiagnosedOnly,
    // diagnostic matching
    diagnosticMode,
    setDiagnosticMode,
    diagnosticType,
    setDiagnosticType,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    customWeights,
    setCustomWeights,
    customCIWeights,
    setCustomCIWeights,
    hasDiagnosticConfig,
    compareWv,
    compareCi,
    compareDisplayLabel,
    // selection
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    // saved candidates
    savedSet,
    toggleSave,
  };
}
