import { Sidebar } from "@/app/components/Sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MyArticles } from "./MyArticles";

export default async function MyArticlesPage() {
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
        <main className="w-full max-w-2xl bg-white border-x border-gray-200/80">
          <MyArticles />
        </main>
      </div>
    </>
  );
}
