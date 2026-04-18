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
import { getLatestResult as getLatestWvResult } from "@/features/work-values/api";
import { getLatestResult as getLatestCiResult } from "@/features/career-interest/api";

const INTERNAL_API = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

export type PanelData = {
  user: ModelsUserResponse;
  username: string;
  experiences: ModelsExperienceResponse[];
  educations: ModelsEducationResponse[];
  skills: ModelsSkillResponse[];
  wvSessionId: string | null;
  ciSessionId: string | null;
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

  return {
    user,
    username,
    experiences,
    educations,
    skills,
    wvSessionId: wvResult?.session_id ?? null,
    ciSessionId: ciResult?.session_id ?? null,
  };
}
