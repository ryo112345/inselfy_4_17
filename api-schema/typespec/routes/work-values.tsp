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
  /** 診断セッション開始（認証ユーザー本人のセッションを作成） */
  @post
  @route("/sessions")
  @summary("Start a work values session")
  @useAuth(Models.CandidateAuth)
  wvStartSession(): {
    @statusCode statusCode: 201;
    @body session: WVSessionResponse;
  } | AuthedNotFoundErrors;

  /** 診断結果送信（セッション所有者のみ） */
  @post
  @route("/sessions/{sessionId}/results")
  @summary("Submit work values responses and estimates")
  @useAuth(Models.CandidateAuth)
  wvSubmitResult(
    @path sessionId: Uuid,
    @body request: WVSubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: WVResultResponse;
  } | AuthedForbiddenErrors;

  /** 最新の診断結果取得 */
  @get
  @route("/users/{userId}/results/latest")
  @summary("Get the latest work values result for a user")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  wvGetLatestResult(
    @path userId: Uuid,
  ): WVResultResponse | AuthedNotFoundErrors;

  /** セッションIDで診断結果取得 */
  @get
  @route("/sessions/{sessionId}/results")
  @summary("Get the work values result by session")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  wvGetResultBySession(
    @path sessionId: Uuid,
  ): WVResultResponse | AuthedNotFoundErrors;

  /** セッションのAIレポート取得 */
  @get
  @route("/sessions/{sessionId}/ai-report")
  @summary("Get the AI report for a work values session")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  wvGetAiReport(
    @path sessionId: Uuid,
  ): AiReportResponse | AuthedNotFoundErrors;
}
