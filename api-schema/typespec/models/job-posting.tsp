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
  @minLength(1)
  @maxLength(100)
  name: string;

  /** 写真URL */
  @maxLength(500)
  photoUrl?: string;
}

/** 求人の入力フィールド（リクエスト・レスポンス共通） */
model JobPostingBase {
  /** 求人タイトル */
  @minLength(1)
  @maxLength(200)
  title: string;

  /** 仕事内容 */
  @maxLength(30000)
  description: string;

  /** 雇用形態 */
  @maxLength(50)
  employmentType: string;

  /** 勤務地（表示用） */
  @maxLength(255)
  location: string | null;

  /** ステータス */
  status: JobPostingStatus;

  /** 職種カテゴリ */
  @maxLength(100)
  jobCategory: string;

  /** 採用人数 */
  @maxLength(100)
  hiringCount: string;

  /** 訴求ポイント */
  @maxLength(10000)
  appealPoints: string;

  /** 課題・チャレンジ */
  @maxLength(10000)
  challenges: string;

  /** チーム紹介 */
  @maxLength(10000)
  teamDescription: string;

  /** チームメンバー */
  @maxItems(5)
  teamMembers: JobPostingTeamMember[];

  /** チームラベル */
  @maxLength(255)
  teamLabel: string;

  /** 紐づくチームID */
  teamId: string | null;

  /** 得られるスキル */
  @maxLength(10000)
  skillsGained: string;

  /** タグ */
  @maxItems(20)
  tags: string[];

  /** 必須要件 */
  @maxLength(10000)
  requiredQualifications: string;

  /** 歓迎要件 */
  @maxLength(10000)
  preferredQualifications: string;

  /** 就業場所 */
  @maxLength(1000)
  workLocation: string;

  /** 就業場所の変更の範囲 */
  @maxLength(255)
  workLocationChangeScope: string;

  /** 業務内容の変更の範囲 */
  @maxLength(255)
  jobDescriptionChangeScope: string;

  /** 契約種別 */
  @maxLength(255)
  contractType: string;

  /** 試用期間 */
  @maxLength(255)
  probationPeriod: string;

  /** 勤務時間 */
  @maxLength(255)
  workHours: string;

  /** 休憩時間 */
  @maxLength(255)
  breakTime: string;

  /** 休日 */
  @maxLength(1000)
  holidays: string;

  /** 給与下限（万円） */
  @minValue(0)
  @maxValue(9999)
  salaryMin: int32 | null;

  /** 給与上限（万円） */
  @minValue(0)
  @maxValue(9999)
  salaryMax: int32 | null;

  /** 給与詳細 */
  @maxLength(10000)
  salaryDetail: string;

  /** 保険 */
  @maxLength(1000)
  insurance: string;

  /** リモートポリシー */
  @maxLength(255)
  remotePolicy: string;

  /** 福利厚生 */
  @maxLength(10000)
  benefits: string;

  /** 受動喫煙対策 */
  @maxLength(255)
  smokingPolicy: string;

  /** 選考プロセス */
  @maxLength(10000)
  selectionProcess: string;

  /** カバー画像URL */
  @maxLength(500)
  coverImageUrl: string;

  /** ハイライトタイトル（役割） */
  @maxLength(50)
  highlightTitleRole: string;

  /** ハイライトタイトル（訴求） */
  @maxLength(50)
  highlightTitleAppeal: string;

  /** ハイライトタイトル（チャレンジ） */
  @maxLength(50)
  highlightTitleChallenge: string;

  /** ハイライトタイトル（成長） */
  @maxLength(50)
  highlightTitleGrowth: string;

  /** ギャラリー画像URL */
  @maxItems(10)
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
