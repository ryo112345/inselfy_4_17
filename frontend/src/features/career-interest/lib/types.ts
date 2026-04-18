export const TYPE_IDS = ["R", "I", "A", "S", "E", "C"] as const;
export type TypeId = (typeof TYPE_IDS)[number];

export const TYPE_LABELS: Record<TypeId, string> = {
  R: "現実的",
  I: "研究的",
  A: "芸術的",
  S: "社会的",
  E: "企業的",
  C: "慣習的",
};

export const TYPE_ENGLISH_NAMES: Record<TypeId, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export const TYPE_DESCRIPTIONS: Record<TypeId, string> = {
  R: "機械や道具を使い、ものづくりや修理など、手を動かして具体的な成果を出す仕事に興味がある",
  I: "データや理論を使って分析・研究し、複雑な問題の本質を解き明かす仕事に興味がある",
  A: "デザイン・文章・映像・音楽など、創造性を活かして自分のアイデアを形にする仕事に興味がある",
  S: "人と直接関わり、教えたり支援したり、誰かの成長や幸せに貢献する仕事に興味がある",
  E: "組織やプロジェクトを率い、交渉や意思決定を通じて成果を上げる仕事に興味がある",
  C: "データや書類を正確に処理し、ルールに基づいて業務を効率的に管理する仕事に興味がある",
};

export const TYPE_ABBREVIATIONS: Record<TypeId, string> = {
  R: "R",
  I: "I",
  A: "A",
  S: "S",
  E: "E",
  C: "C",
};

export const BASIC_INTEREST_IDS = [
  "A1", "A2", "A3",
  "C1", "C2", "C3",
  "E1", "E2", "E3",
  "I1", "I2", "I3", "I4",
  "R1", "R2", "R3",
  "S1", "S2", "S3", "S4",
] as const;

export type BasicInterestId = (typeof BASIC_INTEREST_IDS)[number];

export const BASIC_INTEREST_LABELS: Record<BasicInterestId, string> = {
  A1: "デザイン",
  A2: "コンテンツ制作",
  A3: "デジタルマーケティング・PR",
  C1: "会計・財務",
  C2: "事務・管理",
  C3: "IT・システム",
  E1: "経営・マネジメント",
  E2: "営業・交渉",
  E3: "法務・行政",
  I1: "工学・技術研究",
  I2: "生命科学・医療研究",
  I3: "データサイエンス",
  I4: "社会調査・政策分析",
  R1: "機械・製造",
  R2: "建設・土木",
  R3: "ロボティクス・自動化",
  S1: "教育・研修",
  S2: "カウンセリング・福祉",
  S3: "医療・介護",
  S4: "接客・サービス",
};

export const TYPE_BASIC_INTERESTS: Record<TypeId, BasicInterestId[]> = {
  R: ["R1", "R2", "R3"],
  I: ["I1", "I2", "I3", "I4"],
  A: ["A1", "A2", "A3"],
  S: ["S1", "S2", "S3", "S4"],
  E: ["E1", "E2", "E3"],
  C: ["C1", "C2", "C3"],
};
