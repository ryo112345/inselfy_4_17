import "@typespec/http";
import "@typespec/openapi3";
import "../models/scout.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/scouts")
@tag("CompanyScouts")
interface CompanyScouts {
  /** スカウト送信（企業認証） */
  @post
  @summary("Send a scout message")
  sendScout(
    @body request: SendScoutRequest,
  ): {
    @statusCode statusCode: 201;
    @body scout: ScoutMessageResponse;
  } | BadRequestError | NotFoundError | ForbiddenError;

  /** 送信済みスカウト一覧（企業認証） */
  @get
  @summary("List scouts sent by the company")
  listCompanyScouts(
    /** ステータスで絞り込み */
    @query status?: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): ScoutListResponse | BadRequestError;

  /** スカウトクレジット取得（企業認証） */
  @get
  @route("/credits")
  @summary("Get scout credits")
  getScoutCredits(): ScoutCreditsResponse | BadRequestError;

  /** スカウト品質スコア取得（企業認証） */
  @get
  @route("/quality")
  @summary("Get scout quality score")
  getScoutQuality(): ScoutQualityScoreResponse | BadRequestError;

  /** スカウトダッシュボード取得（企業認証） */
  @get
  @route("/dashboard")
  @summary("Get scout dashboard stats")
  getScoutDashboard(): ScoutDashboardResponse | BadRequestError;

  /** スカウト詳細取得（企業認証） */
  @get
  @route("/{scoutId}")
  @summary("Get scout detail with replies")
  getCompanyScoutDetail(
    @path scoutId: string,
  ): ScoutDetailResponse | NotFoundError | BadRequestError;

  /** スカウトへ返信（企業認証） */
  @post
  @route("/{scoutId}/reply")
  @summary("Reply to a scout as the company")
  companyScoutReply(
    @path scoutId: string,
    @body request: CompanyScoutReplyRequest,
  ): {
    @statusCode statusCode: 201;
  } | BadRequestError | NotFoundError;
}
