import "@typespec/http";
import "@typespec/openapi3";
import "../models/team-diagnose.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/team-diagnose/{token}")
@tag("TeamDiagnose")
interface TeamDiagnose {
  /** 診断リンクのトークンからメンバー情報を取得 */
  @get
  @summary("Get team-diagnose info by token")
  getDiagnoseByToken(
    @path token: string,
  ): DiagnoseInfoResponse | NotFoundError;

  /** 診断ステータス更新 */
  @put
  @route("/status")
  @summary("Update diagnose status by token")
  updateDiagnoseStatus(
    @path token: string,
    @body request: UpdateDiagnoseStatusRequest,
  ): {
    @statusCode statusCode: 204;
  } | BadRequestError | NotFoundError;
}
