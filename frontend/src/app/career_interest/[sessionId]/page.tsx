import { notFound } from "next/navigation";

import { fetchPanelDataByUserId } from "@/features/profile/fetchPanelData";
import { getResultBySessionId } from "@/features/career-interest/api";
import { Sidebar } from "@/app/components/Sidebar";
import { PanelNavigator } from "@/app/profile/[username]/PanelNavigator";
import { ProfileColorContext } from "@/app/profile/[username]/ProfileColorContext";
import { ProfileContent } from "@/app/profile/[username]/ProfileContent";

export const dynamic = "force-dynamic";

export default async function CareerInterestResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let result;
  try {
    result = await getResultBySessionId(sessionId);
  } catch {
    notFound();
  }

  const data = await fetchPanelDataByUserId(result.user_id);
  if (!data) notFound();

  const ciIndex = data.wvSessionId ? 2 : 1;
  const profileColor = data.user.profileColor ?? "#3D8B6E";

  return (
    <ProfileColorContext value={profileColor}>
      <Sidebar
        username={data.username}
        displayName={data.user.displayName}
        diagnostics={data.diagnostics}
      />
      <main className="min-h-screen bg-[#f6f7f5] pt-2 pb-8 ml-[50px]">
        <PanelNavigator
          username={data.username}
          wvSessionId={data.wvSessionId}
          ciSessionId={data.ciSessionId}
          initialPanel={ciIndex}
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
