import { cookies } from "next/headers";
import { Sidebar } from "@/app/components/Sidebar";
import { ArticlesPageClient } from "@/features/articles/ArticlesPageClient";
import { fetchArticles } from "@/features/articles/api";

export default async function ArticlesPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
  const isLoggedIn = !!cookieStore.get("userId")?.value;

  let articles: Awaited<ReturnType<typeof fetchArticles>> | null = null;
  try {
    articles = await fetchArticles();
  } catch {
    // API not available
  }

  return (
    <>
      <Sidebar username={username} displayName={displayName} defaultOpen={sidebarOpen} />
      <div className="min-h-screen md:pl-[50px] bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-6">
          {articles ? (
            <ArticlesPageClient articles={articles.items ?? []} isLoggedIn={isLoggedIn} />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">記事を読み込めませんでした</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
