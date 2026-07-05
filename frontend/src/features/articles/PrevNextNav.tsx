"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchArticles, type ArticleItem } from "./api";

type Props = {
  currentArticle: ArticleItem;
};

export function PrevNextNav({ currentArticle }: Props) {
  const [prev, setPrev] = useState<ArticleItem | null>(null);
  const [next, setNext] = useState<ArticleItem | null>(null);

  useEffect(() => {
    fetchArticles(100, 0)
      .then((data) => {
        if (!data?.items) return;
        const articles: ArticleItem[] = data.items;
        const idx = articles.findIndex((a) => a.id === currentArticle.id);
        if (idx === -1) return;
        if (idx < articles.length - 1) setPrev(articles[idx + 1]);
        if (idx > 0) setNext(articles[idx - 1]);
      })
      .catch(() => {});
  }, [currentArticle.id]);

  if (!prev && !next) return null;

  return (
    <div className="border-t border-gray-200 px-5 py-6">
      <div className="grid grid-cols-2 gap-4">
        {prev ? (
          <Link
            href={`/articles/${prev.id}`}
            className="group flex flex-col p-4 rounded-xl border border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
          >
            <span className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              前の記事
            </span>
            <span className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {prev.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/articles/${next.id}`}
            className="group flex flex-col items-end text-right p-4 rounded-xl border border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
          >
            <span className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              次の記事
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {next.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
