import { Sidebar } from "@/app/components/Sidebar";
import { ArticleForm } from "@/features/articles/ArticleForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function NewArticlePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  if (!userId) {
    redirect("/login");
  }

  return (
    <>
      <Sidebar
        username={username}
        displayName={displayName}
        defaultOpen={sidebarOpen}
      />
      <div className="flex justify-center min-h-screen pl-[50px]">
        <main className="w-full max-w-2xl">
          <ArticleForm />
        </main>
      </div>
    </>
  );
}
