// 複雑加工（複数API合成・kind別ディスパッチ・平均算出）の手書き queryFn 層。
// 素通しの取得は各フックが orval 生成フック/平関数を直接使う（このファイルには置かない）。
// 生成平関数は非2xxで ApiError を throw し、成功時は data を直接返す（旧 hey-api の
// { data, error } 形とは異なる）。
import { careerInterestCiGetLatestResult } from "@/external/client/api/orval/generated/endpoints/career-interest/career-interest";
import { companyTeamsGetTeamScores } from "@/external/client/api/orval/generated/endpoints/company-teams/company-teams";
import { experiencesListExperiences } from "@/external/client/api/orval/generated/endpoints/experiences/experiences";
import {
  savedCandidatesBulkCheckSaved,
  savedCandidatesSaveCandidate,
  savedCandidatesUnsaveCandidate,
} from "@/external/client/api/orval/generated/endpoints/saved-candidates/saved-candidates";
import { skillsListSkills } from "@/external/client/api/orval/generated/endpoints/skills/skills";
import {
  talentSearchCiDiagnosticSearchTalents,
  talentSearchDiagnosticSearchTalents,
  talentSearchIntegratedDiagnosticSearchTalents,
  talentSearchSearchTalents,
} from "@/external/client/api/orval/generated/endpoints/talent-search/talent-search";
import { usersGetUserByUsername } from "@/external/client/api/orval/generated/endpoints/users/users";
import { workValuesWvGetLatestResult } from "@/external/client/api/orval/generated/endpoints/work-values/work-values";
import type {
  ModelsTalentCard,
  TalentSearchSearchTalentsParams,
} from "@/external/client/api/orval/generated/models";
import { ApiError } from "@/lib/api-result";

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
  signal?: AbortSignal,
): Promise<CandidateDetail> {
  const [exp, skill, profile, wv, ci] = await Promise.all([
    experiencesListExperiences(username, { signal }).catch(() => null),
    skillsListSkills(username, { signal }).catch(() => null),
    usersGetUserByUsername(username, { signal }).catch(() => null),
    workValuesWvGetLatestResult(userId, { signal }).catch(() => null),
    careerInterestCiGetLatestResult(userId, { signal }).catch(() => null),
  ]);
  // wv/ci は未診断なら無いのが正常だが、プロフィール系3件が全滅なら取得失敗として扱う
  if (exp === null && skill === null && profile === null) {
    throw new Error("候補者情報の取得に失敗しました");
  }
  return {
    experiences: (exp?.items ?? []).map((e) => ({
      companyName: e.companyName,
      title: e.title,
      isCurrent: e.isCurrent,
      startYear: e.startYear,
      startMonth: e.startMonth,
      endYear: e.endYear ?? null,
      endMonth: e.endMonth ?? null,
      description: e.description,
    })),
    skills: (skill?.items ?? []).map((s) => s.name),
    about: profile?.about ?? null,
    jobSeekingStatus: profile?.jobSeekingStatus ?? null,
    profileColor: profile?.profileColor ?? null,
    wvScores: wv?.values.map((v) => ({ id: v.valueId, score: v.displayScore })) ?? null,
    ciScores: ci?.typeScores.map((s) => ({ id: s.typeId, score: s.score })) ?? null,
  };
}

export async function fetchTeamScoreAverages(
  teamId: string,
): Promise<{ wvAvg: ScorePoint[] | null; ciAvg: ScorePoint[] | null }> {
  const data = await companyTeamsGetTeamScores(teamId);
  const wvAccum: Record<string, { sum: number; count: number }> = {};
  const ciAccum: Record<string, { sum: number; count: number }> = {};
  for (const m of data.items) {
    for (const s of m.wvScores ?? []) {
      if (!wvAccum[s.id]) wvAccum[s.id] = { sum: 0, count: 0 };
      wvAccum[s.id].sum += s.displayScore;
      wvAccum[s.id].count++;
    }
    for (const s of m.ciScores ?? []) {
      if (!ciAccum[s.id]) ciAccum[s.id] = { sum: 0, count: 0 };
      ciAccum[s.id].sum += s.displayScore;
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

export type TalentSearchKind = "plain" | "wv" | "ci" | "integrated";

// wv_<valueId> / ci_<typeId> の動的クエリはスペック上 description 記載のみ
// （OpenAPI で表現できない）のため、緩い Record で受けて生成 Params 型にキャストする
// （生成 URL ビルダーは Object.entries 走査なので余分なキーもそのまま送られる）。
export async function searchTalents(
  kind: TalentSearchKind,
  params: Record<string, string>,
): Promise<{ users: TalentCard[]; total: number }> {
  const query = params as TalentSearchSearchTalentsParams;
  const data =
    kind === "plain"
      ? await talentSearchSearchTalents(query)
      : kind === "ci"
        ? await talentSearchCiDiagnosticSearchTalents(query)
        : kind === "integrated"
          ? await talentSearchIntegratedDiagnosticSearchTalents(query)
          : await talentSearchDiagnosticSearchTalents(query);
  return { users: data.items, total: data.total };
}

// 非2xxは旧実装（res.json() を黙殺）に合わせて無視し、ネットワークエラーのみ throw する
export async function saveCandidate(userId: string): Promise<void> {
  await savedCandidatesSaveCandidate(userId).catch((err) => {
    if (!(err instanceof ApiError)) throw err;
  });
}

export async function unsaveCandidate(userId: string): Promise<void> {
  await savedCandidatesUnsaveCandidate(userId).catch((err) => {
    if (!(err instanceof ApiError)) throw err;
  });
}

export async function bulkCheckSaved(userIds: string[]): Promise<Record<string, boolean>> {
  const data = await savedCandidatesBulkCheckSaved({ userIds });
  return data.saved;
}
