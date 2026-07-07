"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type ArticleItem, fetchArticle } from "@/features/articles/api";

const articleUrlPattern =
  /\/articles\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function extractArticleId(content: string): string | null {
  const match = content.match(articleUrlPattern);
  return match ? match[1] : null;
}

export function removeArticleUrl(content: string): string {
  return content
    .replace(new RegExp(`https?://[^\\s]*${articleUrlPattern.source}[^\\s]*`, "gi"), "")
    .replace(new RegExp(`${articleUrlPattern.source}[^\\s]*`, "gi"), "")
    .trim();
}

const cache = new Map<string, ArticleItem>();

export function ArticlePreviewCard({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<ArticleItem | null>(cache.get(articleId) ?? null);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (article || failed) return;
    let cancelled = false;
    fetchArticle(articleId)
      .then((data) => {
        if (cancelled) return;
        cache.set(articleId, data);
        setArticle(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId, article, failed]);

  if (failed || !article) return null;

  const rawText = (article.body || article.freePreview || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_~`>\-|]/g, "");
  const excerpt = rawText.slice(0, 120).trim();

  const charCount = article.charCount || rawText.length;
  const readingTime = Math.max(1, Math.round(charCount / 500));

  return (
    <div
      className="mt-2 rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50/50 transition-colors cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/articles/${article.id}`);
      }}
    >
      {article.coverImageUrl && (
        <div className="relative w-full aspect-[2/1] bg-gray-100">
          <img src={article.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="font-bold text-[15px] text-gray-900 line-clamp-2 leading-snug">
          {article.title}
        </p>
        {excerpt && (
          <p className="mt-1 text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-gray-400">
          <ArticleIcon />
          <span>{article.authorName}</span>
          <span>·</span>
          <span>{readingTime}分で読める</span>
          {article.isPaid && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-medium">
                ¥{article.priceYen.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
