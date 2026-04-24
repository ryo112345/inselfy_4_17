import type { ArticleItem } from "./api";
import { ArticleCard } from "./ArticleCard";

type Props = {
  articles: ArticleItem[];
};

export function ArticleList({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <p className="text-sm">まだ記事がありません</p>
      </div>
    );
  }

  return (
    <div>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
