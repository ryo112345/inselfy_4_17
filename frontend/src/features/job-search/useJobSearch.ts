"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import type { ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import { getLatestResult as getLatestCiResult } from "@/features/career-interest/api";
import {
  fetchPublicTeamScores,
  type PublicTeamScore as TeamScores,
} from "@/features/company-profile/api";
import type { JobPostingWithCompany } from "@/features/job-posting/api";
import { searchPublicJobPostings } from "@/features/job-posting/api";
import type { ResultDTO as WvResultDTO } from "@/features/work-values/api";
import { getLatestResult as getLatestWvResult } from "@/features/work-values/api";
import type { FilterMode } from "@/features/work-values/ValuesFilterDrawer";
import { PAGE_SIZE } from "./constants";
import { computeMatchScores, type MatchScores } from "./match";

export type SortKey = "newest" | "salary";

/** サーバーコンポーネントで先読みした初期ページ（デフォルト検索条件・offset 0）。 */
export type InitialJobSearchData = {
  jobs: JobPostingWithCompany[];
  total: number;
};

/**
 * 公開求人検索ページの状態（検索条件・価値観フィルタ・結果・ページング・
 * 診断マッチ度計算）を内包するフック。挙動は分割前のページと同一。
 * initialData を渡すと初回マウント時のフェッチをスキップして SSR 結果をそのまま使う。
 */
export function useJobSearch(initialData?: InitialJobSearchData) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPostingWithCompany[]>(initialData?.jobs ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const fetchedCompanyIdsRef = useRef<Set<string>>(new Set());
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean | null>(null);
  const [userWv, setUserWv] = useState<WvResultDTO | null>(null);
  const [userCi, setUserCi] = useState<CiResultDTO | null>(null);
  const [teamScoresMap, setTeamScoresMap] = useState<Map<string, TeamScores>>(new Map());

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("すべて");
  const [employment, setEmployment] = useState("すべて");
  const [remote, setRemote] = useState("すべて");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filterMode, setFilterMode] = useState<FilterMode>("values");
  const [valueThresholds, setValueThresholds] = useState<Record<string, number>>({});
  const [needThresholds, setNeedThresholds] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      Promise.all([
        getLatestWvResult(user.id).catch(() => null),
        getLatestCiResult(user.id).catch(() => null),
      ]).then(([wv, ci]) => {
        setUserWv(wv);
        setUserCi(ci);
        setHasDiagnosis(wv !== null || ci !== null);
      });
    } else {
      setHasDiagnosis(false);
    }
  }, [user]);

  const valueFiltersParam = useMemo(() => {
    const src = filterMode === "values" ? valueThresholds : needThresholds;
    const pairs = Object.entries(src).filter(([, v]) => v > 0);
    if (pairs.length === 0) return "";
    return pairs.map(([id, score]) => `${id}:${score}`).join(",");
  }, [filterMode, valueThresholds, needThresholds]);

  const fetchJobs = useCallback(
    async (reset: boolean, currentOffset: number) => {
      if (!reset && fetchingRef.current) return;
      // reset（フィルタ変更）は進行中のリクエストを中断して置き換える。
      // 古いレスポンスが後着して新しい検索結果を上書きするのを防ぐ。
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      fetchingRef.current = true;
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const data = await searchPublicJobPostings(
          {
            search: search.trim() || undefined,
            category: category !== "すべて" ? category : undefined,
            employmentType: employment !== "すべて" ? employment : undefined,
            remotePolicy: remote !== "すべて" ? remote : undefined,
            sort,
            limit: PAGE_SIZE,
            offset: currentOffset,
            valueFilters: valueFiltersParam || undefined,
            filterMode: valueFiltersParam ? filterMode : undefined,
          },
          ac.signal,
        );
        if (ac.signal.aborted) return;
        if (reset) {
          setJobs(data.items);
        } else {
          setJobs((prev) => {
            const existingIds = new Set(prev.map((j) => j.id));
            const newItems = data.items.filter((j) => !existingIds.has(j.id));
            return [...prev, ...newItems];
          });
        }
        setTotal(data.total);
      } catch (err) {
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "求人の取得に失敗しました");
        }
      } finally {
        // 中断された呼び出しの後始末は、置き換えた新しい呼び出し側が担う
        if (!ac.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
          fetchingRef.current = false;
        }
      }
    },
    [search, category, employment, remote, sort, valueFiltersParam, filterMode],
  );

  // initialData がある場合、初回マウント時の検索条件は SSR 時と同一なのでフェッチ不要
  const skipFirstFetchRef = useRef(initialData !== undefined);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    const needsDebounce = search.trim() || valueFiltersParam;
    const timeout = setTimeout(
      () => {
        fetchJobs(true, 0);
      },
      needsDebounce ? 300 : 0,
    );
    return () => clearTimeout(timeout);
  }, [fetchJobs, search, valueFiltersParam]);

  useEffect(() => {
    if (!hasDiagnosis || jobs.length === 0) return;
    // 取得済みの企業は再取得せず、未取得分だけ差分フェッチする
    const companyIds = [...new Set(jobs.map((j) => j.companyId))].filter(
      (id) => !fetchedCompanyIdsRef.current.has(id),
    );
    if (companyIds.length === 0) return;
    for (const id of companyIds) fetchedCompanyIdsRef.current.add(id);
    Promise.all(companyIds.map((id) => fetchPublicTeamScores(id))).then((results) => {
      setTeamScoresMap((prev) => {
        const map = new Map(prev);
        for (const t of results.flat()) {
          map.set(t.teamId, t);
        }
        return map;
      });
    });
  }, [hasDiagnosis, jobs]);

  const matchScoresMap = useMemo(() => {
    if (!hasDiagnosis || teamScoresMap.size === 0) return new Map<string, MatchScores>();
    const map = new Map<string, MatchScores>();
    for (const job of jobs) {
      if (!job.teamId) continue;
      const team = teamScoresMap.get(job.teamId);
      const scores = computeMatchScores(userWv, userCi, team);
      if (scores) map.set(job.id, scores);
    }
    return map;
  }, [hasDiagnosis, jobs, teamScoresMap, userWv, userCi]);

  const activeFilterCount = useMemo(() => {
    const src = filterMode === "values" ? valueThresholds : needThresholds;
    return Object.values(src).filter((v) => v > 0).length;
  }, [filterMode, valueThresholds, needThresholds]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 分割前と同じく jobs 変化時のみ再評価する
  useEffect(() => {
    if (jobs.length > 0 && (!selectedId || !jobs.some((j) => j.id === selectedId))) {
      setSelectedId(jobs[0].id);
    }
  }, [jobs]);

  const selectedJob = useMemo(
    () => (selectedId ? (jobs.find((j) => j.id === selectedId) ?? null) : null),
    [jobs, selectedId],
  );

  const loadMore = useCallback(() => {
    fetchJobs(false, jobs.length);
  }, [fetchJobs, jobs.length]);

  return {
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
  };
}
