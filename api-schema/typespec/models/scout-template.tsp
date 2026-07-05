import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** スカウトテンプレート作成リクエスト */
model CreateScoutTemplateRequest {
  /** テンプレート名 */
  name: string;

  /** 件名 */
  subject: string;

  /** 本文 */
  body: string;
}

/** スカウトテンプレート更新リクエスト */
model UpdateScoutTemplateRequest is CreateScoutTemplateRequest;

/** スカウトテンプレート */
model ScoutTemplateResponse {
  /** ID */
  id: string;

  /** 企業ID */
  companyId: string;

  /** テンプレート名 */
  name: string;

  /** 件名 */
  subject: string;

  /** 本文 */
  body: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}
