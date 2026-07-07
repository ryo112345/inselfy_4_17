import "@/external/client/api/client";
import {
  type ModelsPublicCompanyProfileResponse,
  type ModelsPublicTeamScoreResponse,
  publicCompanyProfilesGetPublicCompanyProfile,
  publicTeamScoresGetPublicTeamScores,
} from "@/external/client/api/generated";

export type PublicCompanyProfile = ModelsPublicCompanyProfileResponse;
export type PublicTeamScore = ModelsPublicTeamScoreResponse;

export async function fetchPublicCompanyProfile(
  id: string,
  cache?: RequestCache,
): Promise<PublicCompanyProfile | null> {
  try {
    const { data } = await publicCompanyProfilesGetPublicCompanyProfile({
      path: { id },
      cache,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicTeamScores(
  id: string,
  cache?: RequestCache,
): Promise<PublicTeamScore[]> {
  try {
    const { data } = await publicTeamScoresGetPublicTeamScores({
      path: { id },
      cache,
    });
    return data?.items ?? [];
  } catch {
    return [];
  }
}
