"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type ArticleItem, fetchArticles } from "@/features/articles/api";
import type {
  SearchArticleItem,
  SearchCategory,
  SearchJobItem,
  SearchPostItem,
  SearchUserItem,
} from "./api";
import {
  ArticleResultCard,
  JobResultCard,
  PostResultCard,
  UserResultCard,
} from "./SearchResultCards";
import { type SearchTab, useSearch } from "./useSearch";

const TABS: { id: SearchTab; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "users", label: "ユーザー" },
  { id: "articles", label: "記事" },
  { id: "posts", label: "投稿" },
  { id: "jobs", label: "求人" },
];

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  users: "ユーザー",
  articles: "記事",
  posts: "投稿",
  jobs: "求人",
};

type Props = {
  initialQ: string;
  initialTab: SearchTab;
};

export function SearchPageClient({ initialQ, initialTab }: Props) {
  const {
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
    hasQuery,
  } = useSearch(initialQ, initialTab);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const keyword = q.trim();

  return (
    <div className="max-w-[640px] mx-auto">
      {/* 検索バー */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-4 pb-2">
        <div className="relative">
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeLinecap="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="10.5" cy="10.5" r="7.5" />
            <path d="m21 21-4.5-4.5" />
          </svg>
          {/* type="text": type="search" だとブラウザ標準のクリアボタンが出て自作の×と二重になる */}
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="キーワードで みつける"
            maxLength={100}
            className="w-full h-11 pl-11 pr-10 rounded-full bg-gray-100 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none border border-transparent focus:border-[var(--accent)] focus:bg-white transition-colors"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="クリア"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center hover:bg-gray-400 cursor-pointer"
            >
              <svg
                aria-hidden="true"
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        {/* タブ（クエリ入力時のみ） */}
        {hasQuery && (
          <div className="flex border-b border-gray-200/80 mt-2 -mx-4 px-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => changeTab(t.id)}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                  tab === t.id
                    ? "text-gray-900"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-[var(--accent)]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 本文 */}
      {!hasQuery ? (
        <DiscoverySection
          recentSearches={recentSearches}
          onSelect={setQ}
          onRemove={removeRecentSearch}
        />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-gray-400 py-16">{error}</p>
      ) : tab === "all" ? (
        <AllResults
          keyword={keyword}
          allResult={allResult}
          onMore={changeTab}
          onSelectKeyword={setQ}
        />
      ) : (
        <CategoryResults
          tab={tab}
          keyword={keyword}
          result={categoryResult}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}

/** クエリ未入力時の発見フィード（最近の検索・人気のタグ・新着記事）。 */
function DiscoverySection({
  recentSearches,
  onSelect,
  onRemove,
}: {
  recentSearches: string[];
  onSelect: (q: string) => void;
  onRemove: (q: string) => void;
}) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);

  useEffect(() => {
    fetchArticles(20, 0)
      .then((res) => setArticles(res.items ?? []))
      .catch(() => {
        // 発見フィードは取得失敗しても検索自体は使えるので握りつぶす
      });
  }, []);

  const tagCount = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const popularTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return (
    <div className="px-4 py-4 space-y-6">
      {recentSearches.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">最近の検索</h2>
          <ul className="space-y-1">
            {recentSearches.map((kw) => (
              <li key={kw} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(kw)}
                  className="flex-1 flex items-center gap-2.5 text-left text-[14px] text-gray-700 py-1.5 hover:text-gray-900 cursor-pointer min-w-0"
                >
                  <svg
                    aria-hidden="true"
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  <span className="truncate">{kw}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(kw)}
                  aria-label={`${kw} を履歴から削除`}
                  className="shrink-0 text-gray-300 hover:text-gray-500 cursor-pointer p-1"
                >
                  <svg
                    aria-hidden="true"
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {popularTags.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">人気のタグ</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelect(tag)}
                className="text-[13px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-1">新着記事</h2>
          <div className="-mx-4">
            {articles.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.id}`}
                className="block px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors"
              >
                <p className="font-bold text-[15px] text-gray-900 line-clamp-2">{a.title}</p>
                <p className="mt-0.5 text-[13px] text-gray-400">{a.authorName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 「すべて」タブ: カテゴリごとに上位数件をセクション表示する。 */
function AllResults({
  keyword,
  allResult,
  onMore,
  onSelectKeyword,
}: {
  keyword: string;
  allResult: ReturnType<typeof useSearch>["allResult"];
  onMore: (tab: SearchTab) => void;
  onSelectKeyword: (q: string) => void;
}) {
  if (!allResult) return null;

  const sections: { id: SearchCategory; total: number; nodes: React.ReactNode[] }[] = [
    {
      id: "users" as const,
      total: allResult.users.total,
      nodes: allResult.users.items.map((u) => (
        <UserResultCard key={u.id} user={u} keyword={keyword} />
      )),
    },
    {
      id: "articles" as const,
      total: allResult.articles.total,
      nodes: allResult.articles.items.map((a) => (
        <ArticleResultCard key={a.id} article={a} keyword={keyword} />
      )),
    },
    {
      id: "posts" as const,
      total: allResult.posts.total,
      nodes: allResult.posts.items.map((p) => (
        <PostResultCard key={p.id} post={p} keyword={keyword} />
      )),
    },
    {
      id: "jobs" as const,
      total: allResult.jobs.total,
      nodes: allResult.jobs.items.map((j) => (
        <JobResultCard key={j.id} job={j} keyword={keyword} />
      )),
    },
  ].filter((s) => s.total > 0);

  if (sections.length === 0) {
    return <EmptyResults keyword={keyword} onSelectKeyword={onSelectKeyword} />;
  }

  return (
    <div>
      {sections.map((section) => (
        <section key={section.id} className="pt-3">
          <div className="flex items-baseline justify-between px-4 pb-1">
            <h2 className="text-sm font-bold text-gray-900">{CATEGORY_LABELS[section.id]}</h2>
            <span className="text-[12px] text-gray-400">{section.total}件</span>
          </div>
          {section.nodes}
          {section.total > section.nodes.length && (
            <button
              type="button"
              onClick={() => onMore(section.id)}
              className="w-full py-3 text-sm text-[var(--accent)] hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-200/80"
            >
              {CATEGORY_LABELS[section.id]}をもっと見る
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

/** 単一カテゴリタブ: ページング付き一覧。 */
function CategoryResults({
  tab,
  keyword,
  result,
  loadingMore,
  onLoadMore,
}: {
  tab: SearchCategory;
  keyword: string;
  result: ReturnType<typeof useSearch>["categoryResult"];
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!result) return null;
  if (result.total === 0) {
    return <EmptyResults keyword={keyword} />;
  }

  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[12px] text-gray-400">{result.total}件の結果</p>
      {result.items.map((item) => {
        switch (tab) {
          case "users":
            return <UserResultCard key={item.id} user={item as SearchUserItem} keyword={keyword} />;
          case "articles":
            return (
              <ArticleResultCard
                key={item.id}
                article={item as SearchArticleItem}
                keyword={keyword}
              />
            );
          case "posts":
            return <PostResultCard key={item.id} post={item as SearchPostItem} keyword={keyword} />;
          case "jobs":
            return <JobResultCard key={item.id} job={item as SearchJobItem} keyword={keyword} />;
          default:
            return null;
        }
      })}
      {result.items.length < result.total && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-3 text-sm text-[var(--accent)] hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingMore ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}

/** 0件ヒット時: メッセージ＋代替導線（記事の人気タグ）。 */
function EmptyResults({
  keyword,
  onSelectKeyword,
}: {
  keyword: string;
  onSelectKeyword?: (q: string) => void;
}) {
  const [popularTags, setPopularTags] = useState<string[]>([]);

  useEffect(() => {
    if (!onSelectKeyword) return;
    fetchArticles(20, 0)
      .then((res) => {
        const tagCount = new Map<string, number>();
        for (const a of res.items ?? []) {
          for (const t of a.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
        }
        setPopularTags(
          Array.from(tagCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag]) => tag),
        );
      })
      .catch(() => {});
  }, [onSelectKeyword]);

  return (
    <div className="px-4 py-16 text-center">
      <p className="text-[15px] font-bold text-gray-900">「{keyword}」に一致する結果はありません</p>
      <p className="mt-1 text-[13px] text-gray-400">
        キーワードを変えるか、短い言葉で試してみてください
      </p>
      {onSelectKeyword && popularTags.length > 0 && (
        <div className="mt-6">
          <p className="text-[12px] text-gray-400 mb-2">こちらのタグはいかがですか？</p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectKeyword(tag)}
                className="text-[13px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
