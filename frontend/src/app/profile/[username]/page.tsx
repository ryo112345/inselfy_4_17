import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { fetchPanelDataByUsername } from "@/features/profile/fetchPanelData";
import { fetchUserPosts } from "@/features/timeline/api";

import { PanelNavigator } from "./PanelNavigator";
import { ProfileColorContext } from "./ProfileColorContext";
import { ProfileContent } from "./ProfileContent";

export const dynamic = "force-dynamic";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

async function getCurrentUsername(cookieHeader: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    if (res.ok) {
      const data = await res.json();
      return data.username ?? null;
    }
    const refreshRes = await fetch(`${BACKEND}/api/auth/refresh`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
    });
    if (!refreshRes.ok) return null;
    const data = await refreshRes.json();
    return data.username ?? null;
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const [data, currentUsername] = await Promise.all([
    fetchPanelDataByUsername(username, cookieHeader),
    getCurrentUsername(cookieHeader),
  ]);
  if (!data) notFound();
  const usernameFromCookie = cookieStore.get("username")?.value
    ? decodeURIComponent(cookieStore.get("username")!.value)
    : null;
  const isOwner = (currentUsername ?? usernameFromCookie) === data.username;

  const profileColor = data.user.profileColor ?? "#3D8B6E";

  let posts: Awaited<ReturnType<typeof fetchUserPosts>>["items"] = [];
  try {
    const res = await fetchUserPosts(data.user.id);
    posts = res.items ?? [];
  } catch {
    posts = [];
  }

  return (
    <ProfileColorContext value={profileColor}>
      <Sidebar
        username={data.username}
        displayName={data.user.name}
        diagnostics={data.diagnostics}
        defaultOpen={sidebarOpen}
      />
      <main className="min-h-dvh bg-[#f6f7f5] pt-2 pb-8 md:ml-[50px]">
        <PanelNavigator
          userId={data.user.id}
          username={data.username}
          displayName={data.user.name}
          wvSessionId={data.wvSessionId}
          ciSessionId={data.ciSessionId}
          wvResult={data.wvResult}
          ciResult={data.ciResult}
          wvHasReport={data.wvHasReport}
          ciHasReport={data.ciHasReport}
          intReportRequestId={data.intReportRequestId}
          intReportHasReport={data.intReportHasReport}
          isOwner={isOwner}
          initialPanel={0}
        >
          <ProfileContent
            user={data.user}
            username={data.username}
            experiences={data.experiences}
            educations={data.educations}
            skills={data.skills}
            posts={posts}
            isOwner={isOwner}
            intReportRequestId={data.intReportRequestId}
            followersCount={data.followCounts.followersCount}
            followingCount={data.followCounts.followingCount}
          />
        </PanelNavigator>
      </main>
    </ProfileColorContext>
  );
}
