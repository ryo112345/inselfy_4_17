export const NEED_IDS = [
  "ability_utilization",
  "achievement",
  "activity",
  "advancement",
  "authority",
  "autonomy",
  "company_policies",
  "compensation",
  "co_workers",
  "creativity",
  "independence",
  "moral_values",
  "recognition",
  "responsibility",
  "security",
  "social_service",
  "social_status",
  "supervision_hr",
  "supervision_technical",
  "variety",
  "working_conditions",
] as const;

export type NeedId = (typeof NEED_IDS)[number];

export const N = NEED_IDS.length; // 21

export const VALUE_IDS = [
  "achievement",
  "comfort",
  "status",
  "altruism",
  "safety",
  "autonomy",
] as const;

export type ValueId = (typeof VALUE_IDS)[number];

export const VALUE_LABELS: Record<ValueId, string> = {
  achievement: "達成",
  comfort: "労働条件",
  status: "地位・名声",
  altruism: "人間関係",
  safety: "支援",
  autonomy: "自主性",
};

export const VALUE_DESCRIPTIONS: Record<ValueId, string> = {
  achievement: "自分の強みを活かして、やり遂げた手応えを感じたい",
  comfort: "報酬・安定・環境など、仕事の条件面を大切にしたい",
  status: "努力や成果が認められ、キャリアや地位に反映されたい",
  altruism: "良い人間関係の中で、人や社会の役に立つ仕事がしたい",
  safety: "会社や上司に守られ、安心して働ける職場がいい",
  autonomy: "自分の裁量で判断し、自分のスタイルで働きたい",
};

export const VALUE_ABBREVIATIONS: Record<ValueId, string> = {
  achievement: "Ac",
  comfort: "Wc",
  status: "St",
  altruism: "Rl",
  safety: "Sp",
  autonomy: "Id",
};

export const VALUE_ENGLISH_NAMES: Record<ValueId, string> = {
  achievement: "Achievement",
  comfort: "Working Conditions",
  status: "Status",
  altruism: "Relationships",
  safety: "Support",
  autonomy: "Independence",
};

export const VALUE_NEEDS: Record<ValueId, NeedId[]> = {
  achievement: ["ability_utilization", "achievement"],
  comfort: ["activity", "independence", "variety", "compensation", "security", "working_conditions"],
  status: ["advancement", "authority", "recognition", "social_status"],
  altruism: ["co_workers", "moral_values", "social_service"],
  safety: ["company_policies", "supervision_hr", "supervision_technical"],
  autonomy: ["autonomy", "creativity", "responsibility"],
};
