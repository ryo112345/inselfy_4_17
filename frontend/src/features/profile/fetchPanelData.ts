import "@/external/client/api/client";
import {
  educationsListEducations,
  experiencesListExperiences,
  followsListFollowers,
  followsListFollowing,
  skillsListSkills,
  usersGetUserById,
  usersGetUserByUsername,
  type ModelsEducationResponse,
  type ModelsExperienceResponse,
  type ModelsSkillResponse,
  type ModelsUserResponse,
} from "@/external/client/api/generated";
import { getAiReport as getWvAiReport, getLatestResult as getLatestWvResult, type ResultDTO as WvResultDTO } from "@/features/work-values/api";
import { getAiReport as getCiAiReport, getLatestResult as getLatestCiResult, type ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import { getLatestIntegratedRequest } from "@/features/integrated-report/api";
import { VALUE_LABELS, type ValueId } from "@/features/work-values/lib/needs";
import { TYPE_LABELS, type TypeId } from "@/features/career-interest/lib/types";

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

export async function fetchPanelDataByUsername(username: string): Promise<PanelData | null> {
  const userRes = await usersGetUserByUsername({ path: { username } });
  if (userRes.error || !userRes.data) return null;
  return fetchRest(userRes.data, username);
}

export async function fetchPanelDataByUserId(userId: string): Promise<PanelData | null> {
  const userRes = await usersGetUserById({ path: { id: userId } });
  if (userRes.error || !userRes.data) return null;
  return fetchRest(userRes.data, userRes.data.username);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function buildWvKeywords(result: WvResultDTO): string {
  const sorted = [...result.values].sort((a, b) => a.rank - b.rank);
  return sorted
    .slice(0, 3)
    .map((v) => VALUE_LABELS[v.value_id as ValueId] ?? v.value_id)
    .join("・");
}

function buildCiKeywords(result: CiResultDTO): string {
  const sorted = [...result.type_scores].sort((a, b) => a.rank - b.rank);
  return sorted
    .slice(0, 3)
    .map((t) => TYPE_LABELS[t.type_id as TypeId] ?? t.type_id)
    .join("・");
}

async function checkReportExists(sessionId: string, kind: "work-values" | "career-interest"): Promise<boolean> {
  try {
    const report = kind === "work-values" ? await getWvAiReport(sessionId) : await getCiAiReport(sessionId);
    return !!report?.content;
  } catch {
    return false;
  }
}

async function fetchLatestIntegratedRequest(userId: string): Promise<{ requestId: string; hasReport: boolean } | null> {
  try {
    const data = await getLatestIntegratedRequest(userId);
    if (!data) return null;
    return { requestId: data.request_id, hasReport: data.has_report };
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

async function fetchRest(user: ModelsUserResponse, username: string): Promise<PanelData> {
  const [experiencesRes, educationsRes, skillsRes, wvResult, ciResult, intRequest, followCounts] = await Promise.all([
    experiencesListExperiences({ path: { username } }),
    educationsListEducations({ path: { username } }),
    skillsListSkills({ path: { username } }),
    getLatestWvResult(user.id).catch(() => null),
    getLatestCiResult(user.id).catch(() => null),
    fetchLatestIntegratedRequest(user.id),
    fetchFollowCounts(username),
  ]);

  const [wvHasReport, ciHasReport] = await Promise.all([
    wvResult?.session_id ? checkReportExists(wvResult.session_id, "work-values") : Promise.resolve(false),
    ciResult?.session_id ? checkReportExists(ciResult.session_id, "career-interest") : Promise.resolve(false),
  ]);

  const experiences: ModelsExperienceResponse[] = experiencesRes.data?.items ?? [];
  const educations: ModelsEducationResponse[] = educationsRes.data?.items ?? [];
  const skills: ModelsSkillResponse[] = skillsRes.data?.items ?? [];

  const diagnostics: DiagnosticSummary[] = [];
  if (wvResult) {
    diagnostics.push({
      label: "価値観診断",
      date: formatDate(wvResult.created_at),
      keywords: buildWvKeywords(wvResult),
      href: `/work_values/${wvResult.session_id}`,
    });
  }
  if (ciResult) {
    diagnostics.push({
      label: "キャリア興味診断",
      date: formatDate(ciResult.created_at),
      keywords: buildCiKeywords(ciResult),
      href: `/career_interest/${ciResult.session_id}`,
    });
  }

  return {
    user,
    username,
    experiences,
    educations,
    skills,
    wvSessionId: wvResult?.session_id ?? null,
    ciSessionId: ciResult?.session_id ?? null,
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
