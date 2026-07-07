import { formatDateCompact } from "@/lib/date";
import "@/external/client/api/client";
import {
  educationsListEducations,
  experiencesListExperiences,
  followsListFollowers,
  followsListFollowing,
  type ModelsEducationResponse,
  type ModelsExperienceResponse,
  type ModelsSkillResponse,
  type ModelsUserResponse,
  skillsListSkills,
  usersGetUserById,
  usersGetUserByUsername,
} from "@/external/client/api/generated";
import {
  type ResultDTO as CiResultDTO,
  getAiReport as getCiAiReport,
  getLatestResult as getLatestCiResult,
} from "@/features/career-interest/api";
import { TYPE_LABELS, type TypeId } from "@/features/career-interest/lib/types";
import { getLatestIntegratedRequest } from "@/features/integrated-report/api";
import {
  getLatestResult as getLatestWvResult,
  getAiReport as getWvAiReport,
  type ResultDTO as WvResultDTO,
} from "@/features/work-values/api";
import { VALUE_LABELS, type ValueId } from "@/features/work-values/lib/needs";

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

// cookieHeader: サーバコンポーネントから呼ぶ場合に認証Cookieを転送する。
// 診断結果系APIは認証必須のため、これがないと未ログイン扱いになり診断パネルが空になる。
export async function fetchPanelDataByUsername(
  username: string,
  cookieHeader?: string,
): Promise<PanelData | null> {
  const userRes = await usersGetUserByUsername({ path: { username } });
  if (userRes.error || !userRes.data) return null;
  return fetchRest(userRes.data, username, cookieHeader);
}

export async function fetchPanelDataByUserId(
  userId: string,
  cookieHeader?: string,
): Promise<PanelData | null> {
  const userRes = await usersGetUserById({ path: { id: userId } });
  if (userRes.error || !userRes.data) return null;
  return fetchRest(userRes.data, userRes.data.username, cookieHeader);
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

async function checkReportExists(
  sessionId: string,
  kind: "work-values" | "career-interest",
  cookieHeader?: string,
): Promise<boolean> {
  try {
    const report =
      kind === "work-values"
        ? await getWvAiReport(sessionId, cookieHeader)
        : await getCiAiReport(sessionId, cookieHeader);
    return !!report?.content;
  } catch {
    return false;
  }
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
    const [followersRes, followingRes] = await Promise.all([
      followsListFollowers({ path: { username }, query: { limit: 1 } }),
      followsListFollowing({ path: { username }, query: { limit: 1 } }),
    ]);
    return {
      followersCount: followersRes.data?.total ?? 0,
      followingCount: followingRes.data?.total ?? 0,
    };
  } catch {
    return { followersCount: 0, followingCount: 0 };
  }
}

async function fetchRest(
  user: ModelsUserResponse,
  username: string,
  cookieHeader?: string,
): Promise<PanelData> {
  const [experiencesRes, educationsRes, skillsRes, wvResult, ciResult, intRequest, followCounts] =
    await Promise.all([
      experiencesListExperiences({ path: { username } }),
      educationsListEducations({ path: { username } }),
      skillsListSkills({ path: { username } }),
      getLatestWvResult(user.id, cookieHeader).catch(() => null),
      getLatestCiResult(user.id, cookieHeader).catch(() => null),
      fetchLatestIntegratedRequest(user.id),
      fetchFollowCounts(username),
    ]);

  const [wvHasReport, ciHasReport] = await Promise.all([
    wvResult?.sessionId
      ? checkReportExists(wvResult.sessionId, "work-values", cookieHeader)
      : Promise.resolve(false),
    ciResult?.sessionId
      ? checkReportExists(ciResult.sessionId, "career-interest", cookieHeader)
      : Promise.resolve(false),
  ]);

  const experiences: ModelsExperienceResponse[] = experiencesRes.data?.items ?? [];
  const educations: ModelsEducationResponse[] = educationsRes.data?.items ?? [];
  const skills: ModelsSkillResponse[] = skillsRes.data?.items ?? [];

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
    wvHasReport,
    ciHasReport,
    intReportRequestId: intRequest?.requestId ?? null,
    intReportHasReport: intRequest?.hasReport ?? false,
    diagnostics,
    followCounts,
  };
}
