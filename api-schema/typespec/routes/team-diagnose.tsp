import "@typespec/http";
import "@typespec/openapi3";
import "../models/team-diagnose.tsp";
import "../models/work-values.tsp";
import "../models/career-interest.tsp";
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
  } | NotFoundErrors;

  /** 招待トークン認可で Work Values セッション開始（未ログインの招待メンバー用） */
  @post
  @route("/work-values/sessions")
  @summary("Start a work values session via invite token")
  startDiagnoseWvSession(
    @path token: string,
  ): {
    @statusCode statusCode: 201;
    @body session: WVSessionResponse;
  } | NotFoundErrors;

  /** 招待トークン認可で Work Values 結果送信 */
  @post
  @route("/work-values/sessions/{sessionId}/results")
  @summary("Submit work values responses via invite token")
  submitDiagnoseWvResult(
    @path token: string,
    @path sessionId: Uuid,
    @body request: WVSubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: WVResultResponse;
  } | ForbiddenError | NotFoundErrors;

  /** 招待トークン認可で Career Interest セッション開始（未ログインの招待メンバー用） */
  @post
  @route("/career-interest/sessions")
  @summary("Start a career interest session via invite token")
  startDiagnoseCiSession(
    @path token: string,
  ): {
    @statusCode statusCode: 201;
    @body session: CISessionResponse;
  } | NotFoundErrors;

  /** 招待トークン認可で Career Interest 結果送信 */
  @post
  @route("/career-interest/sessions/{sessionId}/results")
  @summary("Submit career interest responses via invite token")
  submitDiagnoseCiResult(
    @path token: string,
    @path sessionId: Uuid,
    @body request: CISubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: CIResultResponse;
  } | ForbiddenError | NotFoundErrors;
}
