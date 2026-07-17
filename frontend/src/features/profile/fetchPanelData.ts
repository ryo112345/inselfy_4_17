import { educationsListEducations } from "@/external/client/api/orval/generated/endpoints/educations/educations";
import { experiencesListExperiences } from "@/external/client/api/orval/generated/endpoints/experiences/experiences";
import {
  followsGetFollowStatus,
  followsListFollowers,
  followsListFollowing,
} from "@/external/client/api/orval/generated/endpoints/follows/follows";
import { skillsListSkills } from "@/external/client/api/orval/generated/endpoints/skills/skills";
import {
  usersGetUserById,
  usersGetUserByUsername,
} from "@/external/client/api/orval/generated/endpoints/users/users";
import type {
  ModelsEducationResponse,
  ModelsExperienceResponse,
  ModelsSkillResponse,
  ModelsUserResponse,
} from "@/external/client/api/orval/generated/models";
import {
  type ResultDTO as CiResultDTO,
  getLatestResult as getLatestCiResult,
} from "@/features/career-interest/api";
import { TYPE_LABELS, type TypeId } from "@/features/career-interest/lib/types";
import { getLatestIntegratedRequest } from "@/features/integrated-report/api";
import {
  getLatestResult as getLatestWvResult,
  type ResultDTO as WvResultDTO,
} from "@/features/work-values/api";
import { VALUE_LABELS, type ValueId } from "@/features/work-values/lib/needs";
import { formatDateCompact } from "@/lib/date";

export type DiagnosticSummary = {
  label: string;
  date: string;
  keywords: string;
  href: string;
};

export type FollowCounts = {
  followersCount: number;
  followingCount: number;
};

export type PanelData = {
  user: ModelsUserResponse;
  username: string;
  experiences: ModelsExperienceResponse[];
  educations: ModelsEducationResponse[];
  skills: ModelsSkillResponse[];
  wvSessionId: string | null;
  ciSessionId: string | null;
  wvResult: WvResultDTO | null;
  ciResult: CiResultDTO | null;
  wvHasReport: boolean;
  ciHasReport: boolean;
  intReportRequestId: string | null;
  intReportHasReport: boolean;
  diagnostics: DiagnosticSummary[];
  followCounts: FollowCounts;
};

// サーバコンポーネントから呼ぶ場合の認証Cookie転送（診断結果系APIは認証必須）は
// @/external/client/api/orval/server の provider が担う。呼び出し元 page で import しておくこと。
export async function fetchPanelDataByUsername(username: string): Promise<PanelData | null> {
  try {
    const user = await usersGetUserByUsername(username);
    return await fetchRest(user, username);
  } catch {
    return null;
  }
}

export async function fetchPanelDataByUserId(userId: string): Promise<PanelData | null> {
  try {
    const user = await usersGetUserById(userId);
    return await fetchRest(user, user.username);
  } catch {
    return null;
  }
}

// フォロー状態。未ログイン（401）・エラー時は null（FollowButton はスペーサー表示）
export async function fetchInitialFollowing(username: string): Promise<boolean | null> {
  try {
    const data = await followsGetFollowStatus(username);
    return data.following;
  } catch {
    return null;
  }
}

function buildWvKeywords(result: WvResultDTO): string {
  const sorted = [...result.values].sort((a, b) => a.rank - b.rank);
  return sorted
    .slice(0, 3)
    .map((v) => VALUE_LABELS[v.valueId as ValueId] ?? v.valueId)
    .join("・");
}

function buildCiKeywords(result: CiResultDTO): string {
  const sorted = [...result.typeScores].sort((a, b) => a.rank - b.rank);
  return sorted
    .slice(0, 3)
    .map((t) => TYPE_LABELS[t.typeId as TypeId] ?? t.typeId)
    .join("・");
}

async function fetchLatestIntegratedRequest(
  userId: string,
): Promise<{ requestId: string; hasReport: boolean } | null> {
  try {
    const data = await getLatestIntegratedRequest(userId);
    if (!data) return null;
    return { requestId: data.requestId, hasReport: data.hasReport };
  } catch {
    return null;
  }
}

async function fetchFollowCounts(username: string): Promise<FollowCounts> {
  try {
    const [followers, following] = await Promise.all([
      followsListFollowers(username, { limit: 1 }),
      followsListFollowing(username, { limit: 1 }),
    ]);
    return {
      followersCount: followers.total ?? 0,
      followingCount: following.total ?? 0,
    };
  } catch {
    return { followersCount: 0, followingCount: 0 };
  }
}

// 各セクションの取得失敗は空表示に落とす（部分失敗でパネル全体を落とさない）
async function fetchRest(user: ModelsUserResponse, username: string): Promise<PanelData> {
  const [experiences, educations, skills, wvResult, ciResult, intRequest, followCounts] =
    await Promise.all([
      experiencesListExperiences(username).then(
        (r) => r.items ?? [],
        () => [] as ModelsExperienceResponse[],
      ),
      educationsListEducations(username).then(
        (r) => r.items ?? [],
        () => [] as ModelsEducationResponse[],
      ),
      skillsListSkills(username).then(
        (r) => r.items ?? [],
        () => [] as ModelsSkillResponse[],
      ),
      getLatestWvResult(user.id).catch(() => null),
      getLatestCiResult(user.id).catch(() => null),
      fetchLatestIntegratedRequest(user.id),
      fetchFollowCounts(username),
    ]);

  const diagnostics: DiagnosticSummary[] = [];
  if (wvResult) {
    diagnostics.push({
      label: "価値観診断",
      date: formatDateCompact(wvResult.createdAt),
      keywords: buildWvKeywords(wvResult),
      href: `/work_values/${wvResult.sessionId}`,
    });
  }
  if (ciResult) {
    diagnostics.push({
      label: "キャリア興味診断",
      date: formatDateCompact(ciResult.createdAt),
      keywords: buildCiKeywords(ciResult),
      href: `/career_interest/${ciResult.sessionId}`,
    });
  }

  return {
    user,
    username,
    experiences,
    educations,
    skills,
    wvSessionId: wvResult?.sessionId ?? null,
    ciSessionId: ciResult?.sessionId ?? null,
    wvResult,
    ciResult,
    wvHasReport: wvResult?.hasReport ?? false,
    ciHasReport: ciResult?.hasReport ?? false,
    intReportRequestId: intRequest?.requestId ?? null,
    intReportHasReport: intRequest?.hasReport ?? false,
    diagnostics,
    followCounts,
  };
}
