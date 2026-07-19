// 公開企業プロフィールの薄いラッパー層。取得失敗を null / 空配列に落とす加工が
// あるため手書きを維持し、内部だけ orval 生成の平関数に置き換えている。

import { publicCompanyProfilesGetPublicCompanyProfile } from "@/external/client/api/orval/generated/endpoints/company-profile/company-profile";
import { publicTeamScoresGetPublicTeamScores } from "@/external/client/api/orval/generated/endpoints/company-teams/company-teams";
import type {
  ModelsPublicCompanyProfileResponse,
  ModelsPublicTeamScoreResponse,
} from "@/external/client/api/orval/generated/models";

export type PublicCompanyProfile = ModelsPublicCompanyProfileResponse;
export type PublicTeamScore = ModelsPublicTeamScoreResponse;

export async function fetchPublicCompanyProfile(
  id: string,
  cache?: RequestCache,
): Promise<PublicCompanyProfile | null> {
  try {
    return await publicCompanyProfilesGetPublicCompanyProfile(id, cache ? { cache } : undefined);
  } catch {
    return null;
  }
}

export async function fetchPublicTeamScores(
  id: string,
  cache?: RequestCache,
): Promise<PublicTeamScore[]> {
  try {
    const data = await publicTeamScoresGetPublicTeamScores(id, cache ? { cache } : undefined);
    return data.items ?? [];
  } catch {
    return [];
  }
}
