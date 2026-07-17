import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { PanelNavigator } from "@/app/profile/[username]/PanelNavigator";
import { ProfileColorContext } from "@/app/profile/[username]/ProfileColorContext";
import { ProfileContent } from "@/app/profile/[username]/ProfileContent";
import { ACCENT } from "@/constants/theme";
// SSR の SDK 呼び出しに認証 Cookie を自動転送する interceptor を登録する
// （hey-api 経由の fetchPanelData と orval 経由の career-interest api が混在するため両方）
import "@/external/client/api/server";
import "@/external/client/api/orval/server";
import { getCurrentUsername, getUsernameFromCookie } from "@/features/auth/viewer";
import { getResultBySessionId } from "@/features/career-interest/api";
import { fetchInitialFollowing, fetchPanelDataByUserId } from "@/features/profile/fetchPanelData";

export const dynamic = "force-dynamic";

export default async function CareerInterestResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const cookieStore = await cookies();

  let result: Awaited<ReturnType<typeof getResultBySessionId>>;
  try {
    result = await getResultBySessionId(sessionId);
  } catch {
    notFound();
  }

  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
  const [data, currentUsername] = await Promise.all([
    fetchPanelDataByUserId(result.userId),
    getCurrentUsername(),
  ]);
  if (!data) notFound();
  const isOwner = (currentUsername ?? getUsernameFromCookie(cookieStore)) === data.username;
  const initialFollowing = isOwner ? null : await fetchInitialFollowing(data.username);

  const ciIndex = 3;
  const profileColor = data.user.profileColor ?? ACCENT;

  return (
    <ProfileColorContext value={profileColor}>
      <Sidebar
        username={data.username}
        displayName={data.user.name}
        diagnostics={data.diagnostics}
        defaultOpen={sidebarOpen}
      />
      <main className="min-h-screen bg-[#f6f7f5] pt-2 pb-8 md:ml-[50px]">
        <PanelNavigator
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
          initialPanel={ciIndex}
        >
          <ProfileContent
            user={data.user}
            username={data.username}
            experiences={data.experiences}
            educations={data.educations}
            skills={data.skills}
            isOwner={isOwner}
            intReportRequestId={data.intReportRequestId}
            intReportHasReport={data.intReportHasReport}
            initialFollowing={initialFollowing}
            followersCount={data.followCounts.followersCount}
            followingCount={data.followCounts.followingCount}
          />
        </PanelNavigator>
      </main>
    </ProfileColorContext>
  );
}
