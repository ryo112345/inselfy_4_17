import "@/external/client/api/client";
import {
  educationsListEducations,
  experiencesListExperiences,
  skillsListSkills,
  usersGetUserByUsername,
  type ModelsEducationResponse,
  type ModelsExperienceResponse,
  type ModelsSkillResponse,
  type ModelsUserResponse,
} from "@/external/client/api/generated";
import { getLatestResult as getLatestWvResult, type ResultDTO as WvResultDTO } from "@/features/work-values/api";
import { getLatestResult as getLatestCiResult, type ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import { VALUE_LABELS, type ValueId } from "@/features/work-values/lib/needs";
import { TYPE_LABELS, type TypeId } from "@/features/career-interest/lib/types";

const INTERNAL_API = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

export type DiagnosticSummary = {
  label: string;
  date: string;
  keywords: string;
  href: string;
};

export type PanelData = {
  user: ModelsUserResponse;
  username: string;
  experiences: ModelsExperienceResponse[];
  educations: ModelsEducationResponse[];
  skills: ModelsSkillResponse[];
  wvSessionId: string | null;
  ciSessionId: string | null;
  diagnostics: DiagnosticSummary[];
};

export async function fetchPanelDataByUsername(username: string): Promise<PanelData | null> {
  const userRes = await usersGetUserByUsername({ path: { username } });
  if (userRes.error || !userRes.data) return null;
  const user = userRes.data as unknown as ModelsUserResponse;
  return fetchRest(user, username);
}

export async function fetchPanelDataByUserId(userId: string): Promise<PanelData | null> {
  const res = await fetch(`${INTERNAL_API}/api/users/id/${userId}`);
  if (!res.ok) return null;
  const user = (await res.json()) as ModelsUserResponse;
  const username = user.username;
  return fetchRest(user, username);
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

async function fetchRest(user: ModelsUserResponse, username: string): Promise<PanelData> {
  const [experiencesRes, educationsRes, skillsRes, wvResult, ciResult] = await Promise.all([
    experiencesListExperiences({ path: { username } }),
    educationsListEducations({ path: { username } }),
    skillsListSkills({ path: { username } }),
    getLatestWvResult(user.id).catch(() => null),
    getLatestCiResult(user.id).catch(() => null),
  ]);

  const experiences: ModelsExperienceResponse[] =
    (experiencesRes.data as unknown as { items?: ModelsExperienceResponse[] } | undefined)
      ?.items ?? [];
  const educations: ModelsEducationResponse[] =
    (educationsRes.data as unknown as { items?: ModelsEducationResponse[] } | undefined)
      ?.items ?? [];
  const skills: ModelsSkillResponse[] =
    (skillsRes.data as unknown as { items?: ModelsSkillResponse[] } | undefined)?.items ?? [];

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
    diagnostics,
  };
}
