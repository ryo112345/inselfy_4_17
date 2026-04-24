import Link from "next/link";
import type { ArticleItem } from "./api";

type Props = {
  article: ArticleItem;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function ArticleCard({ article }: Props) {
  const plainText = stripHtml(article.freePreview);
  const excerpt =
    plainText.length > 120 ? plainText.slice(0, 120) + "…" : plainText;

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ja-JP")
    : null;

  return (
    <Link href={`/articles/${article.id}`} className="block">
      <article className="border-b border-gray-200/80 hover:bg-gray-50/50 transition-colors">
        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            className="w-full h-40 object-cover"
          />
        )}

        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">
              {article.authorName}
            </span>
            {article.authorUsername && (
              <span className="text-xs text-gray-400">
                @{article.authorUsername}
              </span>
            )}
            {publishedDate && (
              <span className="text-xs text-gray-400 ml-auto">
                {publishedDate}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
            {article.title}
          </h3>

          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
            {excerpt}
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            {article.isPaid ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                ¥{article.priceYen.toLocaleString()}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                無料
              </span>
            )}

            {article.tags &&
              article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
