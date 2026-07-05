import "@/external/client/api/client";
import {
  careerInterestCiGetLatestResult,
  companyTeamsGetTeamScores,
  companyTeamsListTeams,
  experiencesListExperiences,
  savedCandidatesBulkCheckSaved,
  savedCandidatesListSavedCandidates,
  savedCandidatesSaveCandidate,
  savedCandidatesUnsaveCandidate,
  skillsListSkills,
  talentSearchCiDiagnosticSearchTalents,
  talentSearchDiagnosticSearchTalents,
  talentSearchIntegratedDiagnosticSearchTalents,
  talentSearchSearchTalents,
  usersGetUserByUsername,
  workValuesWvGetLatestResult,
  type ModelsTalentCard,
  type ModelsTeamResponse,
} from "@/external/client/api/generated";

export type TalentCard = ModelsTalentCard;

export type ScorePoint = { id: string; score: number };

export type CandidateExperience = {
  companyName: string;
  title: string;
  isCurrent: boolean;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  description: string;
};

export type CandidateDetail = {
  experiences: CandidateExperience[];
  skills: string[];
  about: string | null;
  jobSeekingStatus: string | null;
  profileColor: string | null;
  wvScores: ScorePoint[] | null;
  ciScores: ScorePoint[] | null;
};

export async function fetchCandidateDetail(
  username: string,
  userId: string,
): Promise<CandidateDetail> {
  const [exp, skill, profile, wv, ci] = await Promise.all([
    experiencesListExperiences({ path: { username } }).catch(() => null),
    skillsListSkills({ path: { username } }).catch(() => null),
    usersGetUserByUsername({ path: { username } }).catch(() => null),
    workValuesWvGetLatestResult({ path: { userId } }).catch(() => null),
    careerInterestCiGetLatestResult({ path: { userId } }).catch(() => null),
  ]);
  return {
    experiences: (exp?.data?.items ?? []).map((e) => ({
      companyName: e.companyName,
      title: e.title,
      isCurrent: e.isCurrent,
      startYear: e.startYear,
      startMonth: e.startMonth,
      endYear: e.endYear ?? null,
      endMonth: e.endMonth ?? null,
      description: e.description,
    })),
    skills: (skill?.data?.items ?? []).map((s) => s.name),
    about: profile?.data?.about ?? null,
    jobSeekingStatus: profile?.data?.jobSeekingStatus ?? null,
    profileColor: profile?.data?.profileColor ?? null,
    wvScores:
      wv?.data?.values.map((v) => ({ id: v.value_id, score: v.display_score })) ?? null,
    ciScores:
      ci?.data?.type_scores.map((s) => ({ id: s.type_id, score: s.score })) ?? null,
  };
}

export async function fetchTeamScoreAverages(
  teamId: string,
): Promise<{ wvAvg: ScorePoint[] | null; ciAvg: ScorePoint[] | null }> {
  const { data } = await companyTeamsGetTeamScores({ path: { teamId } });
  const wvAccum: Record<string, { sum: number; count: number }> = {};
  const ciAccum: Record<string, { sum: number; count: number }> = {};
  for (const m of data?.members ?? []) {
    for (const s of m.wv_scores ?? []) {
      if (!wvAccum[s.id]) wvAccum[s.id] = { sum: 0, count: 0 };
      wvAccum[s.id].sum += s.display_score;
      wvAccum[s.id].count++;
    }
    for (const s of m.ci_scores ?? []) {
      if (!ciAccum[s.id]) ciAccum[s.id] = { sum: 0, count: 0 };
      ciAccum[s.id].sum += s.display_score;
      ciAccum[s.id].count++;
    }
  }
  const wvAvg = Object.entries(wvAccum).map(([id, { sum, count }]) => ({ id, score: sum / count }));
  const ciAvg = Object.entries(ciAccum).map(([id, { sum, count }]) => ({ id, score: sum / count }));
  return {
    wvAvg: wvAvg.length > 0 ? wvAvg : null,
    ciAvg: ciAvg.length > 0 ? ciAvg : null,
  };
}

export async function fetchCompanyTeams(): Promise<ModelsTeamResponse[]> {
  const { data } = await companyTeamsListTeams();
  return data?.teams ?? [];
}

export type TalentSearchKind = "plain" | "wv" | "ci" | "integrated";

// wv_<valueId> / ci_<typeId> の動的クエリはスペック上 description 記載のみ
// （OpenAPI で表現できない）のため、query は緩い Record で受けてキャストする。
export async function searchTalents(
  kind: TalentSearchKind,
  params: Record<string, string>,
): Promise<{ users: TalentCard[]; total: number }> {
  const query = params as { limit?: number; offset?: number };
  const { data } =
    kind === "plain"
      ? await talentSearchSearchTalents({ query })
      : kind === "ci"
        ? await talentSearchCiDiagnosticSearchTalents({ query })
        : kind === "integrated"
          ? await talentSearchIntegratedDiagnosticSearchTalents({ query })
          : await talentSearchDiagnosticSearchTalents({ query });
  return { users: data?.users ?? [], total: data?.total ?? 0 };
}

export async function fetchSavedCandidates(
  limit: number,
  offset: number,
): Promise<{ users: TalentCard[]; total: number }> {
  const { data } = await savedCandidatesListSavedCandidates({ query: { limit, offset } });
  return { users: data?.users ?? [], total: data?.total ?? 0 };
}

// 非2xxは旧実装（res.json() を黙殺）に合わせて無視し、ネットワークエラーのみ throw する
export async function saveCandidate(userId: string): Promise<void> {
  await savedCandidatesSaveCandidate({ path: { userId } });
}

export async function unsaveCandidate(userId: string): Promise<void> {
  await savedCandidatesUnsaveCandidate({ path: { userId } });
}

export async function bulkCheckSaved(userIds: string[]): Promise<Record<string, boolean>> {
  const { data } = await savedCandidatesBulkCheckSaved({ body: { user_ids: userIds } });
  return data?.saved ?? {};
}
