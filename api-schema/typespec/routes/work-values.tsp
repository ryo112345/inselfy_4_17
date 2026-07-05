import "@typespec/http";
import "@typespec/openapi3";
import "../models/work-values.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/work-values")
@tag("WorkValues")
interface WorkValues {
  /** 診断セッション開始 */
  @post
  @route("/sessions")
  @summary("Start a work values session")
  wvStartSession(
    @body request: WVStartSessionRequest,
  ): {
    @statusCode statusCode: 201;
    @body session: WVSessionResponse;
  } | BadRequestError | NotFoundError;

  /** 診断結果送信 */
  @post
  @route("/sessions/{sessionId}/results")
  @summary("Submit work values responses and estimates")
  wvSubmitResult(
    @path sessionId: string,
    @body request: WVSubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: WVResultResponse;
  } | BadRequestError | NotFoundError;

  /** 最新の診断結果取得 */
  @get
  @route("/users/{userId}/results/latest")
  @summary("Get the latest work values result for a user")
  wvGetLatestResult(
    @path userId: string,
  ): WVResultResponse | NotFoundError | BadRequestError;

  /** セッションIDで診断結果取得 */
  @get
  @route("/sessions/{sessionId}/results")
  @summary("Get the work values result by session")
  wvGetResultBySession(
    @path sessionId: string,
  ): WVResultResponse | NotFoundError | BadRequestError;

  /** セッションのAIレポート取得 */
  @get
  @route("/sessions/{sessionId}/ai-report")
  @summary("Get the AI report for a work values session")
  wvGetAiReport(
    @path sessionId: string,
  ): AiReportResponse | NotFoundError | BadRequestError;
}
