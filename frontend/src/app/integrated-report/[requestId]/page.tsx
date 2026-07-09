import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { PanelNavigator } from "@/app/profile/[username]/PanelNavigator";
import { ProfileColorContext } from "@/app/profile/[username]/ProfileColorContext";
import { ProfileContent } from "@/app/profile/[username]/ProfileContent";
import { ACCENT } from "@/constants/theme";
import { getIntegratedReport } from "@/features/integrated-report/api";
import { fetchPanelDataByUserId } from "@/features/profile/fetchPanelData";
import { buildCookieHeader } from "@/lib/cookie-header";

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
  const cookieHeader = buildCookieHeader(cookieStore);
  const data = await fetchPanelDataByUserId(userId, cookieHeader);
  if (!data) notFound();

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
          wvSessionId={data.wvSessionId}
          ciSessionId={data.ciSessionId}
          wvResult={data.wvResult}
          ciResult={data.ciResult}
          intReportRequestId={data.intReportRequestId}
          intReportHasReport={data.intReportHasReport}
          initialPanel={1}
        >
          <ProfileContent
            user={data.user}
            username={data.username}
            experiences={data.experiences}
            educations={data.educations}
            skills={data.skills}
          />
        </PanelNavigator>
      </main>
    </ProfileColorContext>
  );
}
