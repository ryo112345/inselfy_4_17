"use client";

import { useEffect, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { type ArticleItem, fetchArticles } from "./api";

type Props = {
  currentArticle: ArticleItem;
};

export function RelatedArticles({ currentArticle }: Props) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);

  useEffect(() => {
    fetchArticles(50, 0)
      .then((data) => {
        if (!data?.items) return;
        const all: ArticleItem[] = data.items;
        const currentTags = new Set(currentArticle.tags);

        const scored = all
          .filter((a) => a.id !== currentArticle.id)
          .map((a) => {
            const overlap = a.tags.filter((t) => currentTags.has(t)).length;
            return { article: a, score: overlap };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((s) => s.article);

        setArticles(scored);
      })
      .catch(() => {});
  }, [currentArticle.id, currentArticle.tags]);

  if (articles.length === 0) return null;

  return (
    <section className="border-t border-gray-200 px-5 py-8">
      <h2 className="text-base font-bold text-gray-900 mb-4">関連する記事</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant="grid" />
        ))}
      </div>
    </section>
  );
}
