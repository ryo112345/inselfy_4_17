import "@typespec/http";
import "@typespec/openapi3";
import "../models/scout-settings.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/scout-settings")
@tag("ScoutSettings")
interface ScoutSettings {
  /** スカウト受け入れ設定取得（要ログイン） */
  @get
  @summary("Get scout settings for the authenticated user")
  getScoutSettings(): ScoutSettingsResponse | NotFoundError | BadRequestError;

  /** スカウト受け入れ設定更新（要ログイン） */
  @put
  @summary("Update scout settings for the authenticated user")
  updateScoutSettings(
    @body request: UpdateScoutSettingsRequest,
  ): ScoutSettingsResponse | BadRequestError | NotFoundError;
}
