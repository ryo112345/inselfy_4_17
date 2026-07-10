import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { PanelNavigator } from "@/app/profile/[username]/PanelNavigator";
import { ProfileColorContext } from "@/app/profile/[username]/ProfileColorContext";
import { ProfileContent } from "@/app/profile/[username]/ProfileContent";
import { ACCENT } from "@/constants/theme";
// SSR の SDK 呼び出しに認証 Cookie を自動転送する interceptor を登録する
import "@/external/client/api/server";
import { getCurrentUsername, getUsernameFromCookie } from "@/features/auth/viewer";
import { getIntegratedReport } from "@/features/integrated-report/api";
import { fetchInitialFollowing, fetchPanelDataByUserId } from "@/features/profile/fetchPanelData";

export const dynamic = "force-dynamic";

async function getReportUserId(requestId: string): Promise<string | null> {
  try {
    const data = await getIntegratedReport(requestId);
    return data?.userId ?? null;
  } catch {
    return null;
  }
}

export default async function IntegratedReportPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  const userId = await getReportUserId(requestId);
  if (!userId) notFound();

  const cookieStore = await cookies();
  const [data, currentUsername] = await Promise.all([
    fetchPanelDataByUserId(userId),
    getCurrentUsername(),
  ]);
  if (!data) notFound();
  const isOwner = (currentUsername ?? getUsernameFromCookie(cookieStore)) === data.username;
  const initialFollowing = isOwner ? null : await fetchInitialFollowing(data.username);

  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
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
          initialPanel={1}
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
