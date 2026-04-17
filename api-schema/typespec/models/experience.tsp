import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 職歴作成リクエスト */
model CreateExperienceRequest {
  /** 会社名 */
  @minLength(1)
  @maxLength(200)
  companyName: string;

  /** 役職・タイトル */
  @minLength(1)
  @maxLength(200)
  title: string;

  /** 開始年 */
  @minValue(1950)
  @maxValue(2100)
  startYear: int32;

  /** 開始月（1-12） */
  @minValue(1)
  @maxValue(12)
  startMonth: int32;

  /** 終了年（現職の場合は null） */
  @minValue(1950)
  @maxValue(2100)
  endYear?: int32 | null;

  /** 終了月（現職の場合は null） */
  @minValue(1)
  @maxValue(12)
  endMonth?: int32 | null;

  /** 現職フラグ */
  isCurrent: boolean;

  /** 業務内容（自然文、5000文字以内） */
  @maxLength(5000)
  description?: string;
}

/** 職歴更新リクエスト（全項目置換） */
model UpdateExperienceRequest is CreateExperienceRequest;

/** 職歴 */
model ExperienceResponse {
  /** ID */
  id: string;

  /** ユーザーID */
  userId: string;

  /** 会社名 */
  companyName: string;

  /** タイトル */
  title: string;

  /** 開始年 */
  startYear: int32;

  /** 開始月 */
  startMonth: int32;

  /** 終了年 */
  endYear?: int32 | null;

  /** 終了月 */
  endMonth?: int32 | null;

  /** 現職フラグ */
  isCurrent: boolean;

  /** 業務内容 */
  description: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 職歴一覧 */
model ExperienceListResponse {
  /** 職歴 */
  items: ExperienceResponse[];
}
