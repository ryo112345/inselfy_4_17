import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { fetchPanelDataByUsername } from "@/features/profile/fetchPanelData";
import { Sidebar } from "@/app/components/Sidebar";

import { PanelNavigator } from "./PanelNavigator";
import { ProfileColorContext } from "./ProfileColorContext";
import { ProfileContent } from "./ProfileContent";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
  const data = await fetchPanelDataByUsername(username);
  if (!data) notFound();

  const profileColor = data.user.profileColor ?? "#3D8B6E";

  return (
    <ProfileColorContext value={profileColor}>
      <Sidebar
        username={data.username}
        displayName={data.user.displayName}
        diagnostics={data.diagnostics}
        defaultOpen={sidebarOpen}
      />
      <main className="min-h-screen bg-[#f6f7f5] pt-2 pb-8 ml-[50px]">
        <PanelNavigator
          username={data.username}
          wvSessionId={data.wvSessionId}
          ciSessionId={data.ciSessionId}
          initialPanel={0}
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
