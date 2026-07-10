"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CategoryPage,
  type SearchAllResult,
  type SearchArticleItem,
  type SearchCategory,
  type SearchJobItem,
  type SearchPostItem,
  type SearchUserItem,
  searchAll,
  searchArticles,
  searchJobs,
  searchPosts,
  searchUsers,
} from "./api";

export type SearchTab = "all" | SearchCategory;

const CATEGORY_PAGE_SIZE = 20;
const RECENT_KEY = "inselfy-recent-searches";
const RECENT_MAX = 5;

export type AnySearchItem = SearchUserItem | SearchArticleItem | SearchPostItem | SearchJobItem;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * /search ページの状態（クエリ・タブ・結果・ページング・最近の検索・URL同期）を内包するフック。
 * 入力は300msデバウンスし、進行中のリクエストは AbortController で中断して置き換える。
 */
export function useSearch(initialQ: string, initialTab: SearchTab) {
  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allResult, setAllResult] = useState<SearchAllResult | null>(null);
  const [categoryResult, setCategoryResult] = useState<CategoryPage<AnySearchItem> | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // URL を ?q=&tab= と同期する（リロード・共有・戻るで状態を復元できるように）。
  // ナビゲーションを発生させないよう history を直接書き換える。
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tab !== "all") params.set("tab", tab);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
  }, [q, tab]);

  const saveRecentSearch = useCallback((keyword: string) => {
    setRecentSearches((prev) => {
      const next = [keyword, ...prev.filter((v) => v !== keyword)].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // localStorage が使えない環境では保存しない
      }
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((keyword: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((v) => v !== keyword);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const fetchCategory = useCallback(
    (category: SearchCategory, keyword: string, offset: number, signal: AbortSignal) => {
      const params = { q: keyword, limit: CATEGORY_PAGE_SIZE, offset };
      switch (category) {
        case "users":
          return searchUsers(params, signal);
        case "articles":
          return searchArticles(params, signal);
        case "posts":
          return searchPosts(params, signal);
        case "jobs":
          return searchJobs(params, signal);
      }
    },
    [],
  );

  useEffect(() => {
    const keyword = q.trim();
    if (!keyword) {
      abortRef.current?.abort();
      setAllResult(null);
      setCategoryResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        if (tab === "all") {
          const result = await searchAll(keyword, 3, ac.signal);
          if (ac.signal.aborted) return;
          setAllResult(result);
          setCategoryResult(null);
        } else {
          const result = await fetchCategory(tab, keyword, 0, ac.signal);
          if (ac.signal.aborted) return;
          setCategoryResult(result);
        }
        saveRecentSearch(keyword);
      } catch (err) {
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "検索に失敗しました");
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [q, tab, fetchCategory, saveRecentSearch]);

  const loadMore = useCallback(async () => {
    const keyword = q.trim();
    if (tab === "all" || !keyword || !categoryResult || loadingMore) return;
    setLoadingMore(true);
    try {
      const next: CategoryPage<AnySearchItem> = await fetchCategory(
        tab,
        keyword,
        categoryResult.items.length,
        new AbortController().signal,
      );
      setCategoryResult((prev) =>
        prev ? { items: [...prev.items, ...next.items], total: next.total } : next,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoadingMore(false);
    }
  }, [q, tab, categoryResult, loadingMore, fetchCategory]);

  const changeTab = useCallback((next: SearchTab) => {
    setTab(next);
    setCategoryResult(null);
  }, []);

  return {
    q,
    setQ,
    tab,
    changeTab,
    loading,
    loadingMore,
    error,
    allResult,
    categoryResult,
    loadMore,
    recentSearches,
    removeRecentSearch,
    hasQuery: q.trim() !== "",
  };
}
