import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** スカウト受け入れ設定更新リクエスト */
model UpdateScoutSettingsRequest {
  /** スカウトを受け入れるか */
  acceptingScouts: boolean;
}

/** スカウト受け入れ設定 */
model ScoutSettingsResponse {
  /** スカウトを受け入れるか */
  acceptingScouts: boolean;

  /** 更新日時 */
  updatedAt: utcDateTime;
}
