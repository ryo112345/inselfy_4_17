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

export const NEED_LABELS: Record<NeedId, string> = {
  ability_utilization: "能力活用",
  achievement: "達成感",
  activity: "活動性",
  advancement: "昇進",
  authority: "権限",
  autonomy: "自律性",
  company_policies: "会社方針",
  compensation: "報酬",
  co_workers: "同僚関係",
  creativity: "創造性",
  independence: "独立性",
  moral_values: "道徳観",
  recognition: "承認",
  responsibility: "責任",
  security: "安定性",
  social_service: "社会貢献",
  social_status: "社会的地位",
  supervision_hr: "上司の人間性",
  supervision_technical: "上司の技術力",
  variety: "多様性",
  working_conditions: "労働環境",
};

export const NEED_DESCRIPTIONS: Record<NeedId, string> = {
  ability_utilization: "自分の持つスキルや強みを存分に発揮できる",
  achievement: "目標を達成し、やり遂げた実感を得られる",
  activity: "仕事が途切れず、充実した密度で働ける環境がある",
  advancement: "実力や成果に応じて、キャリアアップできる",
  authority: "チームに方向性を示し、リーダーとして導ける",
  autonomy: "自分のペースややり方で、仕事を進められる",
  company_policies: "会社のルールや扱いが公平で、納得できる",
  compensation: "働きに見合った給与・待遇を得られる",
  co_workers: "気持ちよく協力し合える仲間がいる職場で働ける",
  creativity: "新しいアイデアや工夫を自由に試せる",
  independence: "他者に左右されず、一人で集中して取り組める",
  moral_values: "自分の良心や価値観に反することを強いられない",
  recognition: "自分の仕事ぶりや成果が、周囲にきちんと認められる",
  responsibility: "重要な判断を任され、自分の裁量で意思決定できる",
  security: "長く安心して働き続けられる雇用がある",
  social_service: "誰かの役に立つことが、仕事の中心にある",
  social_status: "職業や立場を通じて、社会的に認められる",
  supervision_hr: "部下の立場に立って、守ってくれる上司がいる",
  supervision_technical: "仕事のやり方やスキルを丁寧に教える上司がいる",
  variety: "毎日同じではなく、変化や新しいことがある",
  working_conditions: "職場の設備・雰囲気・働きやすさが整っている",
};

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
