import { useCallback, useState } from "react";
import { CompanyJobPostingsCreateJobPostingBody } from "@/external/client/api/orval/generated/zod/job-postings/job-postings.zod";
import type { JobPostingBody } from "./api";
import type { JobFormPreviewPayload } from "./preview-channel";

export type TeamMember = { name: string; photoUrl?: string };

/** 求人フォームの全入力値（新規作成・編集で共通） */
export type JobFormValues = {
  title: string;
  jobCategory: string;
  employmentType: string;
  hiringCount: string;
  description: string;
  appealPoints: string;
  challenges: string;
  teamDescription: string;
  teamMembers: TeamMember[];
  teamLabel: string;
  skillsGained: string;
  tags: string[];
  requiredQualifications: string;
  preferredQualifications: string;
  workLocation: string;
  workLocationChangeScope: string;
  jobDescriptionChangeScope: string;
  contractType: string;
  probationPeriod: string;
  workHours: string;
  breakTime: string;
  holidays: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryDetail: string;
  insurance: string;
  smokingPolicy: string;
  benefits: string[];
  remotePolicy: string;
  selectionProcess: string;
  highlightTitleRole: string;
  highlightTitleAppeal: string;
  highlightTitleChallenge: string;
  highlightTitleGrowth: string;
  coverImage: string | null;
  coverImageDataUrl: string | null;
  galleryImages: string[];
};

export const EMPTY_JOB_FORM: JobFormValues = {
  title: "",
  jobCategory: "",
  employmentType: "",
  hiringCount: "",
  description: "",
  appealPoints: "",
  challenges: "",
  teamDescription: "",
  teamMembers: [],
  teamLabel: "",
  skillsGained: "",
  tags: [],
  requiredQualifications: "",
  preferredQualifications: "",
  workLocation: "",
  workLocationChangeScope: "",
  jobDescriptionChangeScope: "",
  contractType: "",
  probationPeriod: "",
  workHours: "",
  breakTime: "",
  holidays: "",
  salaryMin: null,
  salaryMax: null,
  salaryDetail: "",
  insurance: "",
  smokingPolicy: "",
  benefits: [],
  remotePolicy: "",
  selectionProcess: "",
  highlightTitleRole: "仕事内容",
  highlightTitleAppeal: "この仕事の魅力",
  highlightTitleChallenge: "チャレンジ",
  highlightTitleGrowth: "身につくスキル",
  coverImage: null,
  coverImageDataUrl: null,
  galleryImages: [],
};

export type SetJobFormField = <K extends keyof JobFormValues>(
  key: K,
  value: JobFormValues[K] | ((prev: JobFormValues[K]) => JobFormValues[K]),
) => void;

export function useJobForm(initial?: Partial<JobFormValues>) {
  const [values, setValues] = useState<JobFormValues>(() => ({
    ...EMPTY_JOB_FORM,
    ...initial,
  }));

  const set: SetJobFormField = useCallback((key, value) => {
    setValues((prev) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  }, []);

  const missingRequired = [
    { label: "求人タイトル", ok: values.title.trim() !== "" },
    { label: "職種カテゴリ", ok: values.jobCategory !== "" },
    { label: "雇用形態", ok: values.employmentType !== "" },
    { label: "仕事内容", ok: values.description.trim() !== "" },
    { label: "必須要件", ok: values.requiredQualifications.trim() !== "" },
    { label: "勤務地", ok: values.workLocation.trim() !== "" },
    { label: "契約期間", ok: values.contractType.trim() !== "" },
    { label: "試用期間", ok: values.probationPeriod.trim() !== "" },
    { label: "勤務時間", ok: values.workHours.trim() !== "" },
    { label: "休憩時間", ok: values.breakTime.trim() !== "" },
    { label: "休日・休暇", ok: values.holidays.trim() !== "" },
    {
      label: "想定年収または給与詳細",
      ok: values.salaryMin != null || values.salaryMax != null || values.salaryDetail.trim() !== "",
    },
    { label: "社会保険", ok: values.insurance.trim() !== "" },
    { label: "受動喫煙対策", ok: values.smokingPolicy !== "" },
    { label: "就業場所の変更範囲", ok: values.workLocationChangeScope.trim() !== "" },
    { label: "業務内容の変更範囲", ok: values.jobDescriptionChangeScope.trim() !== "" },
  ]
    .filter((f) => !f.ok)
    .map((f) => f.label);
  const requiredOk = missingRequired.length === 0;

  return { values, set, setValues, missingRequired, requiredOk };
}

/** 編集ページの GET /api/company/jobs/:id レスポンスからフォーム値を組み立てる */
export function jobFormValuesFromApi(d: {
  title?: string | null;
  jobCategory?: string | null;
  employmentType?: string | null;
  hiringCount?: string | null;
  description?: string | null;
  appealPoints?: string | null;
  challenges?: string | null;
  teamDescription?: string | null;
  teamLabel?: string | null;
  skillsGained?: string | null;
  tags?: string[] | null;
  requiredQualifications?: string | null;
  preferredQualifications?: string | null;
  workLocation?: string | null;
  workLocationChangeScope?: string | null;
  jobDescriptionChangeScope?: string | null;
  contractType?: string | null;
  probationPeriod?: string | null;
  workHours?: string | null;
  breakTime?: string | null;
  holidays?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryDetail?: string | null;
  insurance?: string | null;
  smokingPolicy?: string | null;
  benefits?: string | null;
  remotePolicy?: string | null;
  selectionProcess?: string | null;
  highlightTitleRole?: string | null;
  highlightTitleAppeal?: string | null;
  highlightTitleChallenge?: string | null;
  highlightTitleGrowth?: string | null;
  teamMembers?: TeamMember[] | null;
  coverImageUrl?: string | null;
  galleryUrls?: string[] | null;
}): JobFormValues {
  return {
    title: d.title ?? "",
    jobCategory: d.jobCategory ?? "",
    employmentType: d.employmentType ?? "",
    hiringCount: d.hiringCount ?? "",
    description: d.description ?? "",
    appealPoints: d.appealPoints ?? "",
    challenges: d.challenges ?? "",
    teamDescription: d.teamDescription ?? "",
    teamLabel: d.teamLabel ?? "",
    skillsGained: d.skillsGained ?? "",
    tags: d.tags ?? [],
    requiredQualifications: d.requiredQualifications ?? "",
    preferredQualifications: d.preferredQualifications ?? "",
    workLocation: d.workLocation ?? "",
    workLocationChangeScope: d.workLocationChangeScope ?? "",
    jobDescriptionChangeScope: d.jobDescriptionChangeScope ?? "",
    contractType: d.contractType ?? "",
    probationPeriod: d.probationPeriod ?? "",
    workHours: d.workHours ?? "",
    breakTime: d.breakTime ?? "",
    holidays: d.holidays ?? "",
    salaryMin: d.salaryMin ?? null,
    salaryMax: d.salaryMax ?? null,
    salaryDetail: d.salaryDetail ?? "",
    insurance: d.insurance ?? "",
    smokingPolicy: d.smokingPolicy ?? "",
    benefits: d.benefits ? d.benefits.split("\n").filter(Boolean) : [],
    remotePolicy: d.remotePolicy ?? "",
    selectionProcess: d.selectionProcess ?? "",
    highlightTitleRole: d.highlightTitleRole || "仕事内容",
    highlightTitleAppeal: d.highlightTitleAppeal || "この仕事の魅力",
    highlightTitleChallenge: d.highlightTitleChallenge || "チャレンジ",
    highlightTitleGrowth: d.highlightTitleGrowth || "身につくスキル",
    teamMembers: d.teamMembers ?? [],
    coverImage: d.coverImageUrl || null,
    coverImageDataUrl: null,
    galleryImages: d.galleryUrls ?? [],
  };
}

export type TeamPreviewInfo = {
  teamId: string | null;
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
};

/** プレビュータブへ送るペイロードを組み立てる */
export function buildPreviewPayload(
  values: JobFormValues,
  team: TeamPreviewInfo = { teamId: null, wvScores: null, ciScores: null },
): JobFormPreviewPayload {
  return {
    title: values.title,
    jobCategory: values.jobCategory,
    employmentType: values.employmentType,
    hiringCount: values.hiringCount,
    description: values.description,
    appealPoints: values.appealPoints,
    challenges: values.challenges,
    teamDescription: values.teamDescription,
    teamMembers: values.teamMembers,
    teamLabel: values.teamLabel,
    teamId: team.teamId,
    teamWVScores: team.wvScores,
    teamCIScores: team.ciScores,
    skillsGained: values.skillsGained,
    tags: values.tags,
    requiredQualifications: values.requiredQualifications,
    preferredQualifications: values.preferredQualifications,
    workLocation: values.workLocation,
    workLocationChangeScope: values.workLocationChangeScope,
    jobDescriptionChangeScope: values.jobDescriptionChangeScope,
    contractType: values.contractType,
    probationPeriod: values.probationPeriod,
    workHours: values.workHours,
    breakTime: values.breakTime,
    holidays: values.holidays,
    salaryMin: values.salaryMin,
    salaryMax: values.salaryMax,
    salaryDetail: values.salaryDetail,
    insurance: values.insurance,
    remotePolicy: values.remotePolicy,
    benefits: values.benefits.join("\n"),
    smokingPolicy: values.smokingPolicy,
    selectionProcess: values.selectionProcess,
    highlightTitleRole: values.highlightTitleRole,
    highlightTitleAppeal: values.highlightTitleAppeal,
    highlightTitleChallenge: values.highlightTitleChallenge,
    highlightTitleGrowth: values.highlightTitleGrowth,
    coverImageDataUrl: values.coverImageDataUrl,
    coverImageUrl: values.coverImage,
    galleryUrls: values.galleryImages,
  };
}

// バリデーションエラー表示用（フォーム UI の見出しと揃える）
export const jobPostingFieldLabels: Record<string, string> = {
  title: "求人タイトル",
  description: "仕事内容",
  employmentType: "雇用形態",
  location: "勤務地",
  jobCategory: "職種カテゴリ",
  hiringCount: "採用人数",
  appealPoints: "この仕事の魅力",
  challenges: "チャレンジ",
  teamDescription: "チーム紹介",
  teamMembers: "チームメンバー",
  teamLabel: "チームラベル",
  skillsGained: "身につくスキル",
  tags: "タグ",
  requiredQualifications: "必須要件",
  preferredQualifications: "歓迎要件",
  workLocation: "就業場所",
  workLocationChangeScope: "就業場所の変更範囲",
  jobDescriptionChangeScope: "業務内容の変更範囲",
  contractType: "契約期間",
  probationPeriod: "試用期間",
  workHours: "勤務時間",
  breakTime: "休憩時間",
  holidays: "休日・休暇",
  salaryMin: "想定年収（下限）",
  salaryMax: "想定年収（上限）",
  salaryDetail: "給与詳細",
  insurance: "社会保険",
  remotePolicy: "リモートワーク",
  benefits: "福利厚生",
  smokingPolicy: "受動喫煙対策",
  selectionProcess: "選考プロセス",
  coverImageUrl: "カバー画像",
  highlightTitleRole: "見出し（仕事内容）",
  highlightTitleAppeal: "見出し（魅力）",
  highlightTitleChallenge: "見出し（チャレンジ）",
  highlightTitleGrowth: "見出し（スキル）",
  galleryUrls: "ギャラリー画像",
};

/**
 * 保存 API へ送る body の検証スキーマ（useFieldErrors の validate に渡す）。
 * 作成・更新はリクエストモデルが同一（Models.JobPostingRequest）のため Create 側の
 * スキーマを共用する。「公開時の必須項目」チェックはドメインルールとして
 * missingRequired（useJobForm）が担い、ここでは文字数上限・数値範囲など
 * スキーマ制約のみを検証する。
 */
export const jobPostingBodySchema = CompanyJobPostingsCreateJobPostingBody;

/**
 * フォーム編集時にエラーをクリアする set ラッパー。fieldErrors のキーは
 * 保存 body のフィールド名なので、フォーム値とキーが異なるものだけ変換する。
 */
export function makeSetWithClear(
  set: SetJobFormField,
  clearField: (name: string) => void,
): SetJobFormField {
  return (key, value) => {
    set(key, value);
    if (key === "coverImage") clearField("coverImageUrl");
    else if (key === "galleryImages") clearField("galleryUrls");
    else clearField(key);
    // location は workLocation から組み立てる派生フィールド
    if (key === "workLocation") clearField("location");
  };
}

/** 保存 API へ送るリクエストボディを組み立てる */
export function buildJobPostingBody(
  values: JobFormValues,
  status: "open" | "draft",
  teamId: string | null,
): JobPostingBody {
  return {
    title: values.title,
    description: values.description,
    employmentType: values.employmentType,
    location: null,
    status,
    jobCategory: values.jobCategory,
    hiringCount: values.hiringCount,
    appealPoints: values.appealPoints,
    challenges: values.challenges,
    teamDescription: values.teamDescription,
    teamMembers: values.teamMembers,
    teamLabel: values.teamLabel,
    teamId,
    skillsGained: values.skillsGained,
    tags: values.tags,
    requiredQualifications: values.requiredQualifications,
    preferredQualifications: values.preferredQualifications,
    workLocation: values.workLocation,
    workLocationChangeScope: values.workLocationChangeScope,
    jobDescriptionChangeScope: values.jobDescriptionChangeScope,
    contractType: values.contractType,
    probationPeriod: values.probationPeriod,
    workHours: values.workHours,
    breakTime: values.breakTime,
    holidays: values.holidays,
    salaryMin: values.salaryMin,
    salaryMax: values.salaryMax,
    salaryDetail: values.salaryDetail,
    insurance: values.insurance,
    remotePolicy: values.remotePolicy,
    benefits: values.benefits.join("\n"),
    smokingPolicy: values.smokingPolicy,
    selectionProcess: values.selectionProcess,
    coverImageUrl: values.coverImage ?? "",
    highlightTitleRole: values.highlightTitleRole,
    highlightTitleAppeal: values.highlightTitleAppeal,
    highlightTitleChallenge: values.highlightTitleChallenge,
    highlightTitleGrowth: values.highlightTitleGrowth,
    galleryUrls: values.galleryImages,
  };
}
