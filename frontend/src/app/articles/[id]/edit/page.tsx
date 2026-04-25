import { Sidebar } from "@/app/components/Sidebar";
import { ArticleForm } from "@/features/articles/ArticleForm";
import { fetchArticle } from "@/features/articles/api";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  if (!userId) {
    redirect("/login");
  }

  let article;
  try {
    article = await fetchArticle(id, { cookie: cookieStore.toString() });
  } catch {
    notFound();
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
          <ArticleForm article={article} />
        </main>
      </div>
    </>
  );
}
