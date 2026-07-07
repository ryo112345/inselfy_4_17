import type { ResultDTO as CiResultDTO } from "@/features/career-interest/api";
import type { PublicTeamScore as TeamScores } from "@/features/company-profile/api";
import type { ResultDTO as WvResultDTO } from "@/features/work-values/api";
import type { ValueId } from "@/features/work-values/lib/needs";
import { VALUE_NEEDS } from "@/features/work-values/lib/needs";

const WV_ORDER = ["achievement", "status", "autonomy", "safety", "altruism", "comfort"];
const CI_ORDER = ["R", "I", "A", "S", "E", "C"];

export type MatchScores = {
  overall: number;
  culture: number;
  aptitude: number;
  commonPoints: string[];
};

const SIGMA_WV = 18;
const SIGMA_CI = 0.7;
const GEOMEAN_FLOOR = 0.001;
function gauss(diff: number, sigma: number) {
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

export function computeMatchScores(
  userWv: WvResultDTO | null,
  userCi: CiResultDTO | null,
  teamScores: TeamScores | undefined,
): MatchScores | null {
  if (!teamScores) return null;

  let culture: number | null = null;
  let aptitude: number | null = null;

  if (userWv && teamScores.wvScores && teamScores.wvScores.length > 0) {
    const userMap = new Map(userWv.values.map((v) => [v.valueId, v.displayScore]));
    const teamMap = new Map(teamScores.wvScores.map((s) => [s.id, s.score]));
    let logSum = 0;
    let weightTotal = 0;
    for (const id of WV_ORDER) {
      const u = userMap.get(id);
      const t = teamMap.get(id);
      if (u != null && t != null) {
        const closeness = gauss(Math.abs(u - t), SIGMA_WV);
        logSum += u * Math.log(closeness + GEOMEAN_FLOOR);
        weightTotal += u;
      }
    }
    if (weightTotal > 0) culture = Math.round(Math.exp(logSum / weightTotal) * 100);
  }

  if (userCi && teamScores.ciScores && teamScores.ciScores.length > 0) {
    const userMap = new Map(userCi.typeScores.map((s) => [s.typeId, s.score]));
    const teamMap = new Map(teamScores.ciScores.map((s) => [s.id, s.score]));
    let logSum = 0;
    let count = 0;
    for (const id of CI_ORDER) {
      const u = userMap.get(id);
      const t = teamMap.get(id);
      if (u != null && t != null) {
        logSum += Math.log(gauss(Math.abs(u - t), SIGMA_CI) + GEOMEAN_FLOOR);
        count++;
      }
    }
    if (count > 0) aptitude = Math.round(Math.exp(logSum / count) * 100);
  }

  if (culture == null && aptitude == null) return null;

  const overall =
    culture != null && aptitude != null
      ? Math.round((culture + aptitude) / 2)
      : (culture ?? aptitude!);

  let commonPoints: string[] = [];
  if (userWv && teamScores.wvScores && teamScores.wvScores.length > 0) {
    const teamMap = new Map(teamScores.wvScores.map((s) => [s.id, s.score]));
    const highValueIds = WV_ORDER.filter((id) => (teamMap.get(id) ?? 0) >= 50) as ValueId[];
    const highNeedIds = new Set(highValueIds.flatMap((vid) => VALUE_NEEDS[vid] ?? []));
    const needLabelMap = new Map(userWv.needs.map((n) => [n.needId, n.label]));
    commonPoints = userWv.needs
      .filter((n) => n.displayScore >= 55 && highNeedIds.has(n.needId as any))
      .sort((a, b) => b.displayScore - a.displayScore)
      .slice(0, 3)
      .map((n) => needLabelMap.get(n.needId) ?? n.needId);
  }

  return { overall, culture: culture ?? overall, aptitude: aptitude ?? overall, commonPoints };
}

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}〜${max}万円`;
  if (min != null) return `${min}万円〜`;
  return `〜${max}万円`;
}
