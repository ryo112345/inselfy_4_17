import { fetchTimeline } from "@/features/timeline/api";
import { Timeline } from "@/features/timeline/Timeline";
import { PostForm } from "@/features/timeline/PostForm";
import { FeedTabs } from "@/features/timeline/FeedTabs";
import { Sidebar } from "@/app/components/Sidebar";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value ?? "";
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  let posts: Awaited<ReturnType<typeof fetchTimeline>> | null = null;
  try {
    posts = await fetchTimeline();
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
      <div className="flex justify-center min-h-screen md:pl-[50px]">
        <main className="w-full max-w-[600px] bg-white border-x border-gray-200/80">
          <FeedTabs />
          <PostForm userId={userId} username={username} displayName={displayName} />

          {posts ? (
            <Timeline posts={posts.items ?? []} />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">タイムラインを読み込めませんでした</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
