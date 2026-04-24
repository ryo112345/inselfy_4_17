import Link from "next/link";
import { fetchArticles } from "@/features/articles/api";
import { ArticleList } from "@/features/articles/ArticleList";
import { Sidebar } from "@/app/components/Sidebar";
import { cookies } from "next/headers";

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
      <Sidebar
        username={username}
        displayName={displayName}
        defaultOpen={sidebarOpen}
      />
      <div className="flex justify-center min-h-screen pl-[50px]">
        <main className="w-full max-w-2xl bg-white border-x border-gray-200/80">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
            <h1 className="text-lg font-bold text-gray-900">記事</h1>
            {isLoggedIn && (
              <Link
                href="/articles/new"
                className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-full hover:opacity-90 transition-colors"
              >
                書く
              </Link>
            )}
          </div>

          {articles ? (
            <ArticleList articles={articles.items ?? []} />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">記事を読み込めませんでした</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
