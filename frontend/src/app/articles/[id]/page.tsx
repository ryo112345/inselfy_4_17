import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { ArticleView } from "@/features/articles/ArticleView";
import { fetchArticle } from "@/features/articles/api";
import { PrevNextNav } from "@/features/articles/PrevNextNav";
import { RelatedArticles } from "@/features/articles/RelatedArticles";
import { ScrollProgress } from "@/features/articles/ScrollProgress";

type Props = {
  params: Promise<{ id: string }>;
};

// generateMetadata とページ本体で同一リクエスト内のフェッチを共有する
const getArticle = cache((id: string, cookie: string) => fetchArticle(id, { cookie }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();
  let article: Awaited<ReturnType<typeof fetchArticle>>;
  try {
    article = await getArticle(id, cookieStore.toString());
  } catch {
    return {};
  }
  const description = article.body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return {
    title: `${article.title} | inselfy`,
    description: description || undefined,
    openGraph: {
      title: article.title,
      description: description || undefined,
      type: "article",
      ...(article.coverImageUrl ? { images: [article.coverImageUrl] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? "guest";
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  let article: Awaited<ReturnType<typeof fetchArticle>>;
  try {
    article = await getArticle(id, cookieStore.toString());
  } catch {
    notFound();
  }

  return (
    <>
      <ScrollProgress />
      <Sidebar username={username} defaultOpen={sidebarOpen} />
      <div className="flex justify-center min-h-screen md:pl-[50px]">
        <main className="w-full max-w-2xl bg-white border-x border-gray-200/80">
          <ArticleView article={article} currentUsername={username} />
          <PrevNextNav currentArticle={article} />
          <RelatedArticles currentArticle={article} />
        </main>
      </div>
    </>
  );
}
