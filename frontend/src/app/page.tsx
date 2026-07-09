import { cookies } from "next/headers";
import { LandingPage } from "@/app/components/LandingPage";
import { Sidebar } from "@/app/components/Sidebar";
import { fetchTimeline } from "@/features/timeline/api";
import { FeedTabs } from "@/features/timeline/FeedTabs";
import { MobilePostButton } from "@/features/timeline/MobilePostButton";
import { PostForm } from "@/features/timeline/PostForm";
import { Timeline } from "@/features/timeline/Timeline";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("inselfy_token")?.value;

  if (!hasToken) {
    return <LandingPage />;
  }

  const userId = cookieStore.get("userId")?.value ?? "";
  const username = cookieStore.get("username")?.value ?? "guest";
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  let posts: Awaited<ReturnType<typeof fetchTimeline>> | null = null;
  try {
    posts = await fetchTimeline(20, 0, userId);
  } catch {
    // API not available
  }

  return (
    <>
      <Sidebar username={username} defaultOpen={sidebarOpen} />
      <div className="flex justify-center min-h-screen md:pl-[50px]">
        <main className="w-full max-w-[600px] bg-white border-x border-gray-200/80">
          <FeedTabs />
          <PostForm />

          {posts ? (
            <Timeline
              initialPosts={posts.items ?? []}
              initialTotal={posts.total}
              currentUserId={userId || undefined}
            />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">タイムラインを読み込めませんでした</p>
            </div>
          )}
        </main>
      </div>
      <MobilePostButton />
    </>
  );
}
