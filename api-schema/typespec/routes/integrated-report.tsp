import "@typespec/http";
import "@typespec/openapi3";
import "../models/integrated-report.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/integrated-report")
@tag("IntegratedReport")
interface IntegratedReport {
  /** 統合レポート生成リクエスト作成（要ログイン） */
  @post
  @route("/requests")
  @summary("Create an integrated report request")
  @useAuth(Models.CandidateAuth)
  createIntegratedReportRequest(
    @body request: CreateIntegratedReportRequest,
  ): {
    @statusCode statusCode: 201;
    @body request: IntegratedReportRequestResponse;
  } | BadRequestError | UnauthorizedError;

  /** 自分の最新統合レポート取得（要ログイン） */
  @get
  @route("/me")
  @summary("Get my latest integrated report")
  @useAuth(Models.CandidateAuth)
  getMyIntegratedReport(): IntegratedReportMineResponse | NotFoundError | BadRequestError | UnauthorizedError;

  /** 自分の統合レポートリクエスト状況取得（要ログイン） */
  @get
  @route("/status")
  @summary("Get my integrated report request status")
  @useAuth(Models.CandidateAuth)
  getIntegratedReportStatus(): IntegratedReportStatusResponse | BadRequestError | UnauthorizedError;

  /** リクエストIDで統合レポート取得（公開） */
  @get
  @route("/requests/{requestId}/report")
  @summary("Get an integrated report by request ID")
  getIntegratedReport(
    @path requestId: string,
  ): IntegratedReportResponse | NotFoundError | BadRequestError;

  /** ユーザーの最新統合レポートリクエスト取得（公開） */
  @get
  @route("/users/{userId}/latest-request")
  @summary("Get the latest integrated report request for a user")
  getLatestIntegratedRequest(
    @path userId: string,
  ): IntegratedReportLatestRequestResponse | NotFoundError | BadRequestError;
}
