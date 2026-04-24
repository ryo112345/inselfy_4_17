"use client";

import { useState } from "react";
import type { ArticleItem } from "./api";
import { createCheckoutSession } from "./api";

type Props = {
  article: ArticleItem;
};

export function ArticleView({ article }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const showFullBody = !article.isPaid || article.purchased;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  async function handlePurchase() {
    setError("");
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(article.id);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article>
      {article.coverImageUrl && (
        <img
          src={article.coverImageUrl}
          alt=""
          className="w-full h-56 object-cover"
        />
      )}

      <div className="px-5 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
            {article.title}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {article.authorName}
            </span>
            {article.authorUsername && (
              <span className="text-gray-400">@{article.authorUsername}</span>
            )}
            {publishedDate && (
              <span className="ml-auto text-gray-400">{publishedDate}</span>
            )}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {article.isPaid && (
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                有料 ¥{article.priceYen.toLocaleString()}
              </span>
              {article.purchased && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  購入済み
                </span>
              )}
            </div>
          )}
        </header>

        <div className="mb-6">
          {showFullBody ? (
            <div
              className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[var(--accent)] prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          ) : (
            <>
              <div
                className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[var(--accent)] prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: article.freePreview }}
              />

              <div className="mt-8 border-t-2 border-dashed border-gray-200 pt-8">
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <p className="text-gray-500 text-sm mb-1">
                    この先は有料コンテンツです
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-4">
                    ¥{article.priceYen.toLocaleString()}
                  </p>

                  {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={handlePurchase}
                    disabled={loading}
                    className="px-8 py-2.5 text-sm font-medium text-white bg-[var(--accent)] rounded-lg hover:opacity-90 disabled:opacity-40 transition-colors"
                  >
                    {loading ? "処理中…" : "購入して続きを読む"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
