import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 求人ステータス */
union JobPostingStatus {
  "draft",
  "open",
}

/** 公開求人一覧のソートキー */
union JobPostingSort {
  /** 新着順（デフォルト） */
  "newest",

  /** 給与順 */
  "salary",
}

/** Work Values フィルタの照合モード */
union JobPostingFilterMode {
  /** 6 Values で照合 */
  "values",

  /** 21 Needs で照合 */
  "needs",
}

/** 求人のチームメンバー */
model JobPostingTeamMember {
  /** 名前 */
  name: string;

  /** 写真URL */
  photoUrl?: string;
}

/** 求人の入力フィールド（リクエスト・レスポンス共通） */
model JobPostingBase {
  /** 求人タイトル */
  title: string;

  /** 仕事内容 */
  description: string;

  /** 雇用形態 */
  employmentType: string;

  /** 勤務地（表示用） */
  location: string | null;

  /** ステータス */
  status: JobPostingStatus;

  /** 職種カテゴリ */
  jobCategory: string;

  /** 採用人数 */
  hiringCount: string;

  /** 訴求ポイント */
  appealPoints: string;

  /** 課題・チャレンジ */
  challenges: string;

  /** チーム紹介 */
  teamDescription: string;

  /** チームメンバー */
  teamMembers: JobPostingTeamMember[];

  /** チームラベル */
  teamLabel: string;

  /** 紐づくチームID */
  teamId: string | null;

  /** 得られるスキル */
  skillsGained: string;

  /** タグ */
  tags: string[];

  /** 必須要件 */
  requiredQualifications: string;

  /** 歓迎要件 */
  preferredQualifications: string;

  /** 就業場所 */
  workLocation: string;

  /** 就業場所の変更の範囲 */
  workLocationChangeScope: string;

  /** 業務内容の変更の範囲 */
  jobDescriptionChangeScope: string;

  /** 契約種別 */
  contractType: string;

  /** 試用期間 */
  probationPeriod: string;

  /** 勤務時間 */
  workHours: string;

  /** 休憩時間 */
  breakTime: string;

  /** 休日 */
  holidays: string;

  /** 給与下限（万円） */
  salaryMin: int32 | null;

  /** 給与上限（万円） */
  salaryMax: int32 | null;

  /** 給与詳細 */
  salaryDetail: string;

  /** 保険 */
  insurance: string;

  /** リモートポリシー */
  remotePolicy: string;

  /** 福利厚生 */
  benefits: string;

  /** 受動喫煙対策 */
  smokingPolicy: string;

  /** 選考プロセス */
  selectionProcess: string;

  /** カバー画像URL */
  coverImageUrl: string;

  /** ハイライトタイトル（役割） */
  highlightTitleRole: string;

  /** ハイライトタイトル（訴求） */
  highlightTitleAppeal: string;

  /** ハイライトタイトル（チャレンジ） */
  highlightTitleChallenge: string;

  /** ハイライトタイトル（成長） */
  highlightTitleGrowth: string;

  /** ギャラリー画像URL */
  galleryUrls: string[];
}

/** 求人作成・更新リクエスト */
model JobPostingRequest {
  ...JobPostingBase;
}

/** 求人 */
model JobPostingResponse {
  /** 求人ID */
  id: Uuid;

  /** 企業ID */
  companyId: Uuid;

  /** 企業名 */
  companyName?: string;

  /** 企業ロゴURL */
  companyLogoUrl?: string;

  /** 公開中か */
  isActive: boolean;

  ...JobPostingBase;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 求人一覧（ページング付き） */
model JobPostingListResponse is ListResponse<JobPostingResponse>;
