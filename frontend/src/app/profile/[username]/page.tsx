import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { ACCENT } from "@/constants/theme";
// SSR の SDK 呼び出しに認証 Cookie を自動転送する provider を登録する
import "@/external/client/api/orval/server";
import { similarUsersGetSimilarUsers } from "@/external/client/api/orval/generated/endpoints/similar-users/similar-users";
import type { ModelsSimilarUserItem } from "@/external/client/api/orval/generated/models";
import { getCurrentUsername, getUsernameFromCookie } from "@/features/auth/viewer";
import { fetchInitialFollowing, fetchPanelDataByUsername } from "@/features/profile/fetchPanelData";
import { fetchUserPosts } from "@/features/timeline/api";

import { PanelNavigator } from "./PanelNavigator";
import { ProfileColorContext } from "./ProfileColorContext";
import { ProfileContent } from "./ProfileContent";

export const dynamic = "force-dynamic";

// 類似ユーザー。エラー時は null（カード側でエラー＋再読み込みを表示）
async function fetchSimilarUsers(userId: string): Promise<ModelsSimilarUserItem[] | null> {
  try {
    const data = await similarUsersGetSimilarUsers(userId, { limit: 20 });
    return data.items ?? [];
  } catch {
    return null;
  }
}

// generateMetadata とページ本体で同一リクエスト内のフェッチを共有する
const getPanelData = cache((username: string) => fetchPanelDataByUsername(username));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getPanelData(username);
  if (!data) return {};
  const title = `${data.user.name} (@${data.username}) | inselfy`;
  const description = data.user.headline ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(data.user.avatarUrl ? { images: [data.user.avatarUrl] } : {}),
    },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";
  const [data, currentUsername, initialFollowing] = await Promise.all([
    getPanelData(username),
    getCurrentUsername(),
    fetchInitialFollowing(username),
  ]);
  if (!data) notFound();
  const isOwner = (currentUsername ?? getUsernameFromCookie(cookieStore)) === data.username;

  const profileColor = data.user.profileColor ?? ACCENT;

  const [posts, similarUsers] = await Promise.all([
    fetchUserPosts(data.user.id)
      .then((res) => res.items ?? [])
      .catch(() => []),
    fetchSimilarUsers(data.user.id),
  ]);

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
          // 類似ユーザーAPIは要ログイン。未ログイン閲覧では 401 をエラー表示にせずカード自体を出さない
          similarUsers={currentUsername ? similarUsers : []}
        >
          <ProfileContent
            user={data.user}
            username={data.username}
            experiences={data.experiences}
            educations={data.educations}
            skills={data.skills}
            posts={posts}
            isOwner={isOwner}
            hasWvDiagnosis={data.wvSessionId !== null}
            hasCiDiagnosis={data.ciSessionId !== null}
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
