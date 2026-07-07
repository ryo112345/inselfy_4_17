// 求人の選択肢マスタ（F10）。編集側（company/jobs）で保存される値が正であり、
// 検索フィルタ（jobs 一覧）も必ずここから import する。
// バックエンドの検索は完全一致（job_postings.sql）なので、ここに無い値でのフィルタは 0 件になる。

export const JOB_CATEGORIES = [
  "エンジニア",
  "デザイナー",
  "プロダクトマネージャー",
  "マーケティング",
  "セールス",
  "カスタマーサクセス",
  "人事・採用",
  "経営企画",
  "その他",
];

export const EMPLOYMENT_TYPES = [
  { value: "正社員", label: "正社員" },
  { value: "契約社員", label: "契約社員" },
  { value: "業務委託", label: "業務委託" },
  { value: "パートタイム", label: "パートタイム" },
  { value: "インターン", label: "インターン" },
];

export const REMOTE_POLICIES = [
  { value: "フルリモート", label: "フルリモート" },
  { value: "リモート可（週数回出社）", label: "リモート可（週数回出社）" },
  { value: "原則出社", label: "原則出社" },
  { value: "フル出社", label: "フル出社" },
];

export const SMOKING_POLICIES = [
  { value: "屋内原則禁煙（喫煙専用室あり）", label: "屋内原則禁煙（喫煙専用室あり）" },
  { value: "屋内全面禁煙", label: "屋内全面禁煙" },
  { value: "屋内禁煙（屋外に喫煙場所あり）", label: "屋内禁煙（屋外に喫煙場所あり）" },
  { value: "敷地内全面禁煙", label: "敷地内全面禁煙" },
];

// 検索フィルタ用（先頭に "すべて"）
export const SEARCH_JOB_CATEGORIES = ["すべて", ...JOB_CATEGORIES];
export const SEARCH_EMPLOYMENT_TYPES = ["すべて", ...EMPLOYMENT_TYPES.map((o) => o.value)];
export const SEARCH_REMOTE_POLICIES = ["すべて", ...REMOTE_POLICIES.map((o) => o.value)];
