import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { ArticleView } from "@/features/articles/ArticleView";
import { fetchArticle } from "@/features/articles/api";
import { PrevNextNav } from "@/features/articles/PrevNextNav";
import { RelatedArticles } from "@/features/articles/RelatedArticles";
import { ScrollProgress } from "@/features/articles/ScrollProgress";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  let article;
  try {
    article = await fetchArticle(id, { cookie: cookieStore.toString() });
  } catch {
    notFound();
  }

  return (
    <>
      <ScrollProgress />
      <Sidebar username={username} displayName={displayName} defaultOpen={sidebarOpen} />
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
