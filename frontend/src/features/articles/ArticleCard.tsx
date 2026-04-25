import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArticleItem } from "./api";

type Props = {
  article: ArticleItem;
  variant?: "compact" | "grid";
};

function estimateReadingTime(body: string, freePreview: string): number {
  const html = body || freePreview;
  const text = html.replace(/<[^>]*>/g, "");
  return Math.max(1, Math.ceil(text.length / 500));
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export function ArticleCard({ article, variant = "compact" }: Props) {
  const router = useRouter();
  const readTime = estimateReadingTime(article.body, article.freePreview);
  const dateLabel = article.publishedAt
    ? formatRelativeDate(article.publishedAt)
    : null;

  if (variant === "grid") {
    return (
      <Link href={`/articles/${article.id}`} className="block group">
        <article className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
            {article.coverImageUrl ? (
              <img
                src={article.coverImageUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="text-gray-300">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}
            {article.isPaid && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)] backdrop-blur-sm">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                ¥{article.priceYen.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex-1 p-4">
            {article.tags.length > 0 && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {article.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-light)] rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h3 className="text-[15px] font-bold text-gray-900 leading-[1.5] line-clamp-2 group-hover:text-gray-600 transition-colors mb-3">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 mt-auto">
              <div
                role={article.authorUsername ? "link" : undefined}
                onClick={article.authorUsername ? (e) => { e.preventDefault(); e.stopPropagation(); router.push(`/profile/${article.authorUsername}`); } : undefined}
                className={`flex items-center gap-2 min-w-0${article.authorUsername ? " cursor-pointer hover:underline" : ""}`}
              >
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium text-gray-600 shrink-0">
                  {article.authorName.charAt(0)}
                </span>
                <span className="text-[13px] text-gray-600 truncate">
                  {article.authorName}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto shrink-0 text-[12px] text-gray-400">
                <span className="flex items-center gap-0.5">
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gray-400">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {readTime}分
                </span>
                {dateLabel && <span>{dateLabel}</span>}
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/articles/${article.id}`} className="block group">
      <article className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="text-gray-300">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          )}
          {article.isPaid && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)] backdrop-blur-sm">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              ¥{article.priceYen.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex-1 px-3 pt-3 pb-1">
          <h3 className="text-[15px] font-bold text-gray-900 leading-[1.45] line-clamp-2 group-hover:text-gray-600 transition-colors">
            {article.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 px-3 pt-1 pb-3">
          <div
            role={article.authorUsername ? "link" : undefined}
            onClick={article.authorUsername ? (e) => { e.preventDefault(); e.stopPropagation(); router.push(`/profile/${article.authorUsername}`); } : undefined}
            className={`flex items-center gap-2 min-w-0${article.authorUsername ? " cursor-pointer hover:underline" : ""}`}
          >
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium text-gray-600 shrink-0">
              {article.authorName.charAt(0)}
            </span>
            <span className="text-[13px] text-gray-700 truncate">
              {article.authorName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto shrink-0 text-[12px] text-gray-400">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gray-400">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{readTime}分</span>
            {dateLabel && (
              <>
                <span className="text-gray-300">·</span>
                <span>{dateLabel}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
