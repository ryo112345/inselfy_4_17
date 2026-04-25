"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { ArticleItem } from "./api";
import { createCheckoutSession } from "./api";
import { TableOfContents, type TOCItem } from "./TableOfContents";

type Props = {
  article: ArticleItem;
  currentUsername?: string;
};

function estimateReadingTime(body: string, freePreview: string): number {
  const html = body || freePreview;
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.ceil(text.length / 500));
}

function processHtmlForToc(html: string): {
  html: string;
  tocItems: TOCItem[];
} {
  const tocItems: TOCItem[] = [];
  let counter = 0;

  const processed = html.replace(
    /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string | undefined, content: string) => {
      const id = `toc-${counter++}`;
      const text = content.replace(/<[^>]*>/g, "").trim();
      const level = parseInt(tag[1]);
      if (text) {
        tocItems.push({ id, text, level });
      }
      return `<${tag}${attrs || ""} id="${id}">${content}</${tag}>`;
    },
  );

  return { html: processed, tocItems };
}

export function ArticleView({ article, currentUsername }: Props) {
  const isOwner =
    currentUsername &&
    currentUsername !== "guest" &&
    currentUsername === article.authorUsername;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pastEngagement, setPastEngagement] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const engagementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = engagementRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPastEngagement(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onScroll() {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsScrolling(false), 800);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  const showFloating = pastEngagement && !isScrolling;

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

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShareX = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      "_blank",
      "noopener",
    );
  }, [article.title]);

  const handleShareLine = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${url}`,
      "_blank",
      "noopener",
    );
  }, []);

  const showFullBody = !article.isPaid || article.purchased;
  const readTime = estimateReadingTime(article.body, article.freePreview);

  const bodyHtml = showFullBody ? article.body : article.freePreview;
  const { html: processedHtml, tocItems } = useMemo(
    () => processHtmlForToc(bodyHtml),
    [bodyHtml],
  );

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

  const renderEngagementButtons = (floating: boolean) => (
    <>
      <button
        type="button"
        onClick={handleLike}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full ${floating ? "hover:bg-red-50/80" : "hover:bg-red-50"} transition-colors cursor-pointer group/like`}
        aria-label={liked ? "いいねを取り消す" : "いいね"}
      >
        <svg
          width={18}
          height={18}
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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full ${floating ? "hover:bg-blue-50/80" : "hover:bg-blue-50"} transition-colors cursor-pointer group/bm`}
        aria-label={bookmarked ? "ブックマークを解除" : "ブックマーク"}
      >
        <svg
          width={18}
          height={18}
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

      <button
        type="button"
        onClick={handleCopyLink}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full ${floating ? "hover:bg-gray-100/80" : "hover:bg-gray-100"} transition-colors cursor-pointer group/share`}
        aria-label="リンクをコピー"
      >
        {copied ? (
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--accent)]"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 group-hover/share:text-gray-600"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    </>
  );

  return (
    <article>
      {/* Breadcrumbs */}
      <nav className="px-5 py-3 text-xs text-gray-400 border-b border-gray-100 flex items-center gap-1.5 min-w-0">
        <Link href="/" className="hover:text-gray-600 transition-colors shrink-0">
          ホーム
        </Link>
        <span className="shrink-0">/</span>
        <Link
          href="/articles"
          className="hover:text-gray-600 transition-colors shrink-0"
        >
          記事
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-gray-500 truncate">
          {article.title.length > 30
            ? article.title.slice(0, 30) + "…"
            : article.title}
        </span>
      </nav>

      {/* Cover image */}
      {article.coverImageUrl && (
        <div>
          <img
            src={article.coverImageUrl}
            alt=""
            className="w-full"
          />
        </div>
      )}

      <div className="px-6 sm:px-10 py-8">
        <header className="mb-8">
          <h1 className="text-[28px] sm:text-3xl font-bold text-gray-900 leading-[1.35] mb-5">
            {article.title}
          </h1>

          {/* Author info */}
          <div className="flex items-center gap-3 mb-3">
            {article.authorUsername ? (
              <Link
                href={`/profile/${article.authorUsername}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <span className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {article.authorName.charAt(0)}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {article.authorName}
                  </span>
                  <span className="text-xs text-gray-400">
                    @{article.authorUsername}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {article.authorName.charAt(0)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {article.authorName}
                </span>
              </div>
            )}
            {isOwner && (
              <Link
                href={`/articles/${article.id}/edit`}
                className="ml-auto px-3 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                編集
              </Link>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
            {publishedDate && (
              <>
                <span>{publishedDate}</span>
                <span>·</span>
              </>
            )}
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
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
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

          {/* Paid badge */}
          {article.isPaid && (
            <div>
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

        {/* Table of Contents */}
        {showFullBody && <TableOfContents items={tocItems} />}

        {/* Body */}
        <div className="mb-8">
          {showFullBody ? (
            <div
              className="prose prose-gray max-w-none prose-p:text-[18px] prose-li:text-[18px] prose-headings:text-gray-900 prose-headings:scroll-mt-4 prose-p:text-gray-700 prose-p:leading-[1.85] prose-a:text-[var(--accent)] prose-img:rounded-lg prose-li:text-gray-700"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          ) : (
            <>
              <div
                className="prose prose-gray max-w-none prose-p:text-[18px] prose-li:text-[18px] prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-[1.85] prose-a:text-[var(--accent)] prose-img:rounded-lg prose-li:text-gray-700"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
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

        {/* Engagement bar (inline) */}
        <div
          ref={engagementRef}
          className="flex items-center gap-1 border-y border-gray-100 py-2 mb-8"
        >
          {renderEngagementButtons(false)}
        </div>

        {/* Share section */}
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500 mb-3">
            この記事をシェア
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareX}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
            </button>
            <button
              type="button"
              onClick={handleShareLine}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="#06C755">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[var(--accent)]">コピーしました</span>
                </>
              ) : (
                <>
                  <svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  リンクをコピー
                </>
              )}
            </button>
          </div>
        </div>

        {/* Author card */}
        {article.authorUsername && (
          <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <Link href={`/profile/${article.authorUsername}`} className="shrink-0">
                <span className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600 hover:ring-2 hover:ring-[var(--accent)]/20 transition-all">
                  {article.authorName.charAt(0)}
                </span>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Written by</p>
                <Link
                  href={`/profile/${article.authorUsername}`}
                  className="text-base font-bold text-gray-900 hover:text-[var(--accent)] transition-colors"
                >
                  {article.authorName}
                </Link>
                <p className="text-sm text-gray-400 mb-3">
                  @{article.authorUsername}
                </p>
                <Link
                  href={`/profile/${article.authorUsername}`}
                  className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-[var(--accent)] border border-[var(--accent)] rounded-full hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  プロフィールを見る
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating engagement bar — bottom right of article column */}
      {showFloating && (
        <div
          className="fixed bottom-6 z-40 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-2 py-1 shadow-lg"
          style={{ right: "calc(50% - 336px + 50px/2)" }}
        >
          {renderEngagementButtons(true)}
        </div>
      )}
    </article>
  );
}
