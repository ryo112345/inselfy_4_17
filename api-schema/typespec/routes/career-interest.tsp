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
  /** 診断セッション開始 */
  @post
  @route("/sessions")
  @summary("Start a career interest session")
  ciStartSession(
    @body request: CIStartSessionRequest,
  ): {
    @statusCode statusCode: 201;
    @body session: CISessionResponse;
  } | BadRequestError | NotFoundError;

  /** 診断結果送信 */
  @post
  @route("/sessions/{sessionId}/results")
  @summary("Submit career interest responses")
  ciSubmitResult(
    @path sessionId: string,
    @body request: CISubmitResultRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: CIResultResponse;
  } | BadRequestError | NotFoundError;

  /** 最新の診断結果取得 */
  @get
  @route("/users/{userId}/results/latest")
  @summary("Get the latest career interest result for a user")
  ciGetLatestResult(
    @path userId: string,
  ): CIResultResponse | NotFoundError | BadRequestError;

  /** セッションIDで診断結果取得 */
  @get
  @route("/sessions/{sessionId}/results")
  @summary("Get the career interest result by session")
  ciGetResultBySession(
    @path sessionId: string,
  ): CIResultResponse | NotFoundError | BadRequestError;
}
