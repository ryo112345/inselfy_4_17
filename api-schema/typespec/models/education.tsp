import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 学歴作成リクエスト */
model CreateEducationRequest {
  /** 学校名 */
  @minLength(1)
  @maxLength(200)
  school: string;

  /** 学部・学科・学位 */
  @maxLength(200)
  degree?: string | null;

  /** 入学年 */
  @minValue(1950)
  @maxValue(2100)
  startYear?: int32 | null;

  /** 卒業年 */
  @minValue(1950)
  @maxValue(2100)
  endYear?: int32 | null;
}

/** 学歴更新リクエスト */
model UpdateEducationRequest is CreateEducationRequest;

/** 学歴 */
model EducationResponse {
  /** ID */
  id: string;

  /** ユーザーID */
  userId: string;

  /** 学校名 */
  school: string;

  /** 学部・学科 */
  degree?: string | null;

  /** 入学年 */
  startYear?: int32 | null;

  /** 卒業年 */
  endYear?: int32 | null;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 学歴一覧 */
model EducationListResponse {
  /** 学歴 */
  items: EducationResponse[];
}
