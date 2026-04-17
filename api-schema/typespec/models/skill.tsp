import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** スキル追加リクエスト */
model AttachSkillRequest {
  /** スキル名（1-100文字） */
  @minLength(1)
  @maxLength(100)
  name: string;
}

/** スキル */
model SkillResponse {
  /** スキルID */
  id: string;

  /** スキル名 */
  name: string;

  /** 追加日時（user_skills.created_at） */
  attachedAt: utcDateTime;
}

/** スキル一覧 */
model SkillListResponse {
  /** スキル */
  items: SkillResponse[];
}
