import { ArticleSection } from "./ArticleSection";
import type { ArticleItem } from "./api";

type Props = {
  articles: ArticleItem[];
};

function groupByTopTag(articles: ArticleItem[]) {
  const tagMap = new Map<string, ArticleItem[]>();

  for (const article of articles) {
    if (article.tags.length === 0) continue;
    const tag = article.tags[0];
    const list = tagMap.get(tag) ?? [];
    list.push(article);
    tagMap.set(tag, list);
  }

  const groups = Array.from(tagMap.entries())
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, items]) => ({ tag, articles: items }));

  const usedIds = new Set(groups.flatMap((g) => g.articles.map((a) => a.id)));
  const remaining = articles.filter((a) => !usedIds.has(a.id));

  return { groups, remaining };
}

export function ArticleList({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <p className="text-sm">まだ記事がありません</p>
      </div>
    );
  }

  const { groups, remaining } = groupByTopTag(articles);

  return (
    <div className="space-y-8 px-6 py-6">
      {remaining.length > 0 && <ArticleSection title="最新の記事" articles={remaining} />}

      {groups.map((group) => (
        <ArticleSection key={group.tag} title={group.tag} articles={group.articles} />
      ))}
    </div>
  );
}
