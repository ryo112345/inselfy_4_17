export const SCORE_COLORS = {
  tier1: "#149470",
  tier2: "#10b77f",
  tier3: "#8aa3d6",
  tier4: "#cfd0cd",
};

export const DEFAULT_BADGE = {
  border: "#40b090",
  text: "#057f5d",
  bg: "#ebf9f3",
  labelColor: "#787878",
  descColor: "#787878",
  needLabelColor: "#525a66",
  needLabelWeight: "500",
  rankColor: "#8c8e97",
  rankBottomColor: "#2d5395",
  headingColor: "#5e5a5a",
};

export type BadgeColors = typeof DEFAULT_BADGE;
export type ScoreColors = typeof SCORE_COLORS;

export function scoreColor(score: number, colors: ScoreColors): string {
  if (score >= 4.0) return colors.tier1;
  if (score >= 3.0) return colors.tier2;
  if (score >= 2.0) return colors.tier3;
  return colors.tier4;
}
