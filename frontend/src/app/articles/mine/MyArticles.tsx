"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyArticles, type ArticleItem } from "@/features/articles/api";

type Tab = "draft" | "published";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function MyArticleCard({ article }: { article: ArticleItem }) {
  const plainText = stripHtml(article.body);
  const excerpt =
    plainText.length > 100 ? plainText.slice(0, 100) + "…" : plainText;

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ja-JP")
    : new Date(article.updatedAt).toLocaleDateString("ja-JP") + " 更新";

  const href =
    article.status === "draft"
      ? `/articles/${article.id}/edit`
      : `/articles/${article.id}`;

  return (
    <Link href={href} className="block">
      <div className="px-5 py-4 border-b border-gray-200/80 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          {article.status === "draft" && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              下書き
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{date}</span>
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-snug">
          {article.title || "無題"}
        </h3>

        {excerpt && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{excerpt}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {article.isPaid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              ¥{article.priceYen.toLocaleString()}
            </span>
          )}
          {article.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function MyArticles() {
  const [tab, setTab] = useState<Tab>("draft");
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMyArticles()
      .then((res) => setArticles(res.items ?? []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const drafts = articles.filter((a) => a.status === "draft");
  const published = articles.filter((a) => a.status === "published");
  const current = tab === "draft" ? drafts : published;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
        <h1 className="text-lg font-bold text-gray-900">記事の管理</h1>
        <Link
          href="/articles/new"
          className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-full hover:opacity-90 transition-colors"
        >
          書く
        </Link>
      </div>

      <div className="flex border-b border-gray-200/80">
        <TabButton
          active={tab === "draft"}
          onClick={() => setTab("draft")}
          count={drafts.length}
        >
          下書き
        </TabButton>
        <TabButton
          active={tab === "published"}
          onClick={() => setTab("published")}
          count={published.length}
        >
          公開済み
        </TabButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <p className="text-sm">読み込み中…</p>
        </div>
      ) : current.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <p className="text-sm">
            {tab === "draft"
              ? "下書きはありません"
              : "公開済みの記事はありません"}
          </p>
          {tab === "draft" && (
            <Link
              href="/articles/new"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              記事を書く
            </Link>
          )}
        </div>
      ) : (
        <div>
          {current.map((article) => (
            <MyArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors relative ${
        active
          ? "text-gray-900"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
      {count > 0 && (
        <span className="ml-1.5 text-xs text-gray-400">{count}</span>
      )}
      {active && (
        <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gray-900 rounded-full" />
      )}
    </button>
  );
}
