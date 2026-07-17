"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCompanyTeamsListTeamsQueryKey,
  useCompanyTeamsListTeams,
} from "@/external/client/api/orval/generated/endpoints/company-teams/company-teams";
import {
  bulkCheckSaved,
  fetchTeamScoreAverages,
  saveCandidate,
  searchTalents,
  type TalentCard,
  type TalentSearchKind,
  unsaveCandidate,
} from "./api";
import {
  savedCandidatesQueryKey,
  talentSearchQueryKey,
  teamScoreAveragesQueryKey,
} from "./queryKeys";

export type Team = {
  id: string;
  name: string;
};

export type DiagnosticMode = "team" | "custom";
export type DiagnosticType = "wv" | "ci" | "integrated";

export const TALENTS_PAGE_SIZE = 20;

/** 検索ボタン押下（またはマウント時のURL復元）で確定した検索条件。null は未検索 */
type SubmittedSearch = {
  kind: TalentSearchKind;
  /** limit/offset を含まない検索条件（queryKey に使う） */
  params: Record<string, string>;
  /** 戻る復元時は前回までの読み込み件数を1ページ目でまとめて取得する */
  firstPageLimit: number;
};

/**
 * 人材検索ページの状態（検索条件・診断マッチング設定・結果・ページング・
 * URL同期・保存済み候補者）を内包するフック。挙動は分割前のページと同一。
 */
export function useTalentSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const initialTeamId = searchParams.get("team") ?? "";

  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null);

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

  // 素通し取得は生成フックを直接使い、.items ほどきは select で吸収する
  const teamsQuery = useCompanyTeamsListTeams({
    query: {
      queryKey: getCompanyTeamsListTeamsQueryKey(),
      select: (data) => data.items,
    },
  });
  const teams: Team[] = teamsQuery.data ?? [];

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
        // 保存した候補者一覧ページのキャッシュを古いまま残さない
        queryClient.invalidateQueries({ queryKey: savedCandidatesQueryKey });
      } catch {
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (isSaved) next.add(userId);
          else next.delete(userId);
          return next;
        });
      }
    },
    [savedSet, queryClient],
  );

  // Team average scores for compare overlay
  const teamAveragesEnabled = diagnosticMode === "team" && !!selectedTeamId;
  const teamAveragesQuery = useQuery({
    queryKey: teamScoreAveragesQueryKey(selectedTeamId),
    queryFn: () => fetchTeamScoreAverages(selectedTeamId),
    enabled: teamAveragesEnabled,
  });
  const teamWvAvg = (teamAveragesEnabled ? teamAveragesQuery.data?.wvAvg : null) ?? null;
  const teamCiAvg = (teamAveragesEnabled ? teamAveragesQuery.data?.ciAvg : null) ?? null;
  const teamName = teamAveragesEnabled
    ? (teams.find((t) => t.id === selectedTeamId)?.name ?? "チーム")
    : "";

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

  // ── Search results（useInfiniteQuery。submitted が確定するまで実行しない）──
  const searchQuery = useInfiniteQuery({
    queryKey: submitted
      ? talentSearchQueryKey(submitted.kind, submitted.params)
      : talentSearchQueryKey("idle", {}),
    queryFn: ({ pageParam }) => {
      if (!submitted) return Promise.resolve({ users: [] as TalentCard[], total: 0 });
      return searchTalents(submitted.kind, {
        ...submitted.params,
        limit: String(pageParam.limit),
        offset: String(pageParam.offset),
      });
    },
    initialPageParam: { offset: 0, limit: submitted?.firstPageLimit ?? TALENTS_PAGE_SIZE },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.users.length, 0);
      return loaded < lastPage.total ? { offset: loaded, limit: TALENTS_PAGE_SIZE } : undefined;
    },
    enabled: submitted !== null,
  });

  const users = useMemo(() => {
    const seen = new Set<string>();
    const out: TalentCard[] = [];
    for (const page of searchQuery.data?.pages ?? []) {
      for (const u of page.users) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          out.push(u);
        }
      }
    }
    return out;
  }, [searchQuery.data]);
  const total = searchQuery.data?.pages.at(-1)?.total ?? 0;

  const searched = submitted !== null;
  const loading = searchQuery.isLoading;
  const loadingMore = searchQuery.isFetchingNextPage;
  const hasMore = searchQuery.hasNextPage;

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

  const buildDiagnosticParams = useCallback(() => {
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
    return params;
  }, [
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
  ]);

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

  const buildSearchParams = useCallback(() => {
    if (!hasDiagnosticConfig) {
      const params: Record<string, string> = {};
      if (keyword) params.q = keyword;
      if (skills.length > 0) params.skills = skills.join(",");
      if (location) params.location = location;
      if (industry) params.industry = industry;
      if (seekingStatus) params.jobSeekingStatus = seekingStatus;
      if (jobType) params.jobType = jobType;
      if (diagnosedOnly) params.diagnosed = "1";
      return params;
    }
    return buildDiagnosticParams();
  }, [
    hasDiagnosticConfig,
    buildDiagnosticParams,
    keyword,
    skills,
    location,
    industry,
    seekingStatus,
    jobType,
    diagnosedOnly,
  ]);

  // Auto-search on mount: restore from URL or from team page link.
  // 検索種別は handleSearch と同じ判定（getSearchKind / buildSearchParams）を使う。
  // かつての「mode=team かつチーム未選択なら復元しない」早期 return は、プレーン検索の
  // URL にも常に mode=team が付くため復元を全滅させていた（プレーン検索として復元するのが正）
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
      syncFiltersToURL();
      setSubmitted({
        kind: getSearchKind(),
        params: buildSearchParams(),
        firstPageLimit: restoreLimit ?? TALENTS_PAGE_SIZE,
      });
    }
  }, []);

  const handleSearch = useCallback(() => {
    syncFiltersToURL();
    setSubmitted({
      kind: getSearchKind(),
      params: buildSearchParams(),
      firstPageLimit: TALENTS_PAGE_SIZE,
    });
  }, [getSearchKind, buildSearchParams, syncFiltersToURL]);

  const handleLoadMore = useCallback(() => {
    void searchQuery.fetchNextPage();
  }, [searchQuery.fetchNextPage]);

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
