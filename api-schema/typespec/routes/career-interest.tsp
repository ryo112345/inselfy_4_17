import "@typespec/http";
import "@typespec/openapi3";
import "../models/career-interest.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/career-interest")
@tag("CareerInterest")
interface CareerInterest {
  /** 診断セッション開始（認証ユーザー本人のセッションを作成） */
  @post
  @route("/sessions")
  @summary("Start a career interest session")
  @useAuth(Models.CandidateAuth)
  ciStartSession(): {
    @statusCode statusCode: 201;
    @body session: CISessionResponse;
  } | AuthedNotFoundErrors;

  /** 診断結果送信（セッション所有者のみ） */
  @post
  @route("/sessions/{sessionId}/results")
  @summary("Submit career interest responses")
  @useAuth(Models.CandidateAuth)
  ciSubmitResult(
    @path sessionId: Uuid,
    @body request: CISubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: CIResultResponse;
  } | AuthedForbiddenErrors;

  /** 最新の診断結果取得 */
  @get
  @route("/users/{userId}/results/latest")
  @summary("Get the latest career interest result for a user")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  ciGetLatestResult(
    @path userId: Uuid,
  ): CIResultResponse | AuthedNotFoundErrors;

  /** セッションIDで診断結果取得 */
  @get
  @route("/sessions/{sessionId}/results")
  @summary("Get the career interest result by session")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  ciGetResultBySession(
    @path sessionId: Uuid,
  ): CIResultResponse | AuthedNotFoundErrors;

  /** セッションのAIレポート取得 */
  @get
  @route("/sessions/{sessionId}/ai-report")
  @summary("Get the AI report for a career interest session")
  @useAuth(Models.CandidateAuth | Models.CompanyAuth)
  ciGetAiReport(
    @path sessionId: Uuid,
  ): AiReportResponse | AuthedNotFoundErrors;
}
