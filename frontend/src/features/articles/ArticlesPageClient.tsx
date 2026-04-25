"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { ArticleItem } from "./api";
import { ArticleCard } from "./ArticleCard";
import { ArticleSection } from "./ArticleSection";

type Props = {
  articles: ArticleItem[];
  isLoggedIn: boolean;
};

function groupByTopTag(articles: ArticleItem[]) {
  const tagMap = new Map<string, ArticleItem[]>();
  for (const article of articles) {
    if (article.tags.length === 0) continue;
    const tag = article.tags[0];
    const list = tagMap.get(tag) ?? [];
    list.push(article);
    tagMap.set(tag, list);
  }
  const groups = Array.from(tagMap.entries())
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, items]) => ({ tag, articles: items }));
  const usedIds = new Set(groups.flatMap((g) => g.articles.map((a) => a.id)));
  const remaining = articles.filter((a) => !usedIds.has(a.id));
  return { groups, remaining };
}

function getAllTags(articles: ArticleItem[]): string[] {
  const tagCount = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

const GRID_PAGE_SIZE = 12;

export function ArticlesPageClient({ articles, isLoggedIn }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [gridPageSize, setGridPageSize] = useState(GRID_PAGE_SIZE);

  const allTags = useMemo(() => getAllTags(articles), [articles]);

  const isFiltering = searchQuery.trim() !== "" || activeTag !== null;

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (activeTag) {
      result = result.filter((a) => a.tags.includes(activeTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.replace(/<[^>]*>/g, "").toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [articles, searchQuery, activeTag]);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
    setSearchQuery("");
    setGridPageSize(GRID_PAGE_SIZE);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setActiveTag(null);
    setGridPageSize(GRID_PAGE_SIZE);
  }, []);

  const featured = useMemo(() => articles.slice(0, 3), [articles]);
  const featuredIds = useMemo(
    () => new Set(featured.map((a) => a.id)),
    [featured],
  );

  const { groups, remaining } = useMemo(() => {
    const nonFeatured = articles.filter((a) => !featuredIds.has(a.id));
    return groupByTopTag(nonFeatured);
  }, [articles, featuredIds]);

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <p className="text-sm">まだ記事がありません</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 shrink-0">よむ</h1>
        <div className="flex-1 relative max-w-md">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setGridPageSize(GRID_PAGE_SIZE);
            }}
            placeholder="記事・タグ・著者を検索..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        {isLoggedIn && (
          <Link
            href="/articles/new"
            className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-full hover:opacity-90 transition-colors shrink-0"
          >
            書く
          </Link>
        )}
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          <button
            type="button"
            onClick={handleClearFilters}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full shrink-0 transition-all cursor-pointer ${
              !activeTag
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full shrink-0 transition-all cursor-pointer ${
                activeTag === tag
                  ? "bg-[var(--accent)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Filtered view (search or tag active) */}
      {isFiltering ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {activeTag && (
                <span className="inline-flex items-center gap-1.5 mr-2">
                  <span className="px-2 py-0.5 text-[12px] font-medium text-[var(--accent)] bg-[var(--accent-light)] rounded-full">
                    {activeTag}
                  </span>
                </span>
              )}
              {filteredArticles.length}件の記事
              {searchQuery && (
                <span className="text-gray-400">
                  {" "}
                  「{searchQuery}」
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[13px] text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              クリア
            </button>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg
                width={48}
                height={48}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                className="mb-4 text-gray-300"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-sm font-medium text-gray-500 mb-1">
                一致する記事が見つかりませんでした
              </p>
              <p className="text-[13px] text-gray-400">
                キーワードを変えて検索してみてください
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredArticles.slice(0, gridPageSize).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="grid"
                  />
                ))}
              </div>
              {filteredArticles.length > gridPageSize && (
                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    onClick={() =>
                      setGridPageSize((prev) => prev + GRID_PAGE_SIZE)
                    }
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    もっと見る（残り
                    {filteredArticles.length - gridPageSize}件）
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Browse view (default) */
        <div className="space-y-10">
          {/* Featured / Pickup section */}
          {featured.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-500"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">ピックアップ</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="grid"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tag-grouped sections */}
          {groups.map((group) => (
            <ArticleSection
              key={group.tag}
              title={group.tag}
              articles={group.articles}
              tag={group.tag}
              onTagClick={handleTagClick}
            />
          ))}

          {/* Remaining articles */}
          {remaining.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                最新の記事
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {remaining.slice(0, gridPageSize).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="grid"
                  />
                ))}
              </div>
              {remaining.length > gridPageSize && (
                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    onClick={() =>
                      setGridPageSize((prev) => prev + GRID_PAGE_SIZE)
                    }
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    もっと見る
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
