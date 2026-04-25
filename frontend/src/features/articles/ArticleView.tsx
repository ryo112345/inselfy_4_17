"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { ArticleItem } from "./api";
import { createCheckoutSession } from "./api";

type Props = {
  article: ArticleItem;
};

function estimateReadingTime(body: string, freePreview: string): number {
  const html = body || freePreview;
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.ceil(text.length / 500));
}

export function ArticleView({ article }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
  }, [liked]);

  const handleBookmark = useCallback(() => {
    setBookmarked((prev) => !prev);
    setBookmarkAnimating(true);
    setTimeout(() => setBookmarkAnimating(false), 250);
  }, []);

  const showFullBody = !article.isPaid || article.purchased;
  const readTime = estimateReadingTime(article.body, article.freePreview);

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

          {/* Author info */}
          <div className="flex items-center gap-3 mb-3">
            {article.authorUsername ? (
              <Link
                href={`/profile/${article.authorUsername}`}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <span className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[13px] font-medium text-gray-600">
                  {article.authorName.charAt(0)}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {article.authorName}
                  </span>
                  <span className="text-[12px] text-gray-400">
                    @{article.authorUsername}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[13px] font-medium text-gray-600">
                  {article.authorName.charAt(0)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {article.authorName}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto text-[13px] text-gray-400">
              <span className="flex items-center gap-1">
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {readTime}分で読める
              </span>
              {publishedDate && <span>{publishedDate}</span>}
            </div>
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </Link>
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

        {/* Engagement bar */}
        <div className="flex items-center gap-1 border-t border-gray-100 pt-4 mb-2">
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer group/like"
            aria-label={liked ? "いいねを取り消す" : "いいね"}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-all duration-200 ${
                liked
                  ? "text-red-500"
                  : "text-gray-400 group-hover/like:text-red-400"
              } ${likeAnimating ? "scale-125" : "scale-100"}`}
              style={{
                transitionTimingFunction: likeAnimating
                  ? "cubic-bezier(0.17, 0.89, 0.32, 1.49)"
                  : "ease",
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount > 0 && (
              <span
                className={`text-sm tabular-nums transition-all duration-200 ${
                  liked ? "text-red-500 font-medium" : "text-gray-500"
                } ${likeAnimating ? "scale-110" : "scale-100"}`}
              >
                {likeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleBookmark}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-blue-50 transition-colors cursor-pointer group/bm"
            aria-label={bookmarked ? "ブックマークを解除" : "ブックマーク"}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-all duration-200 ${
                bookmarked
                  ? "text-blue-500"
                  : "text-gray-400 group-hover/bm:text-blue-400"
              } ${bookmarkAnimating ? "scale-110" : "scale-100"}`}
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
