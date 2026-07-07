import "@typespec/http";
import "@typespec/openapi3";
import "../models/scout.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/scouts")
@tag("CompanyScouts")
@useAuth(Models.CompanyAuth)
interface CompanyScouts {
  /** スカウト送信（企業認証） */
  @post
  @summary("Send a scout message")
  sendScout(
    @body request: SendScoutRequest,
  ): {
    @statusCode statusCode: 201;
    @body scout: ScoutMessageResponse;
  } | AuthedForbiddenErrors;

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
  ): ScoutListResponse | AuthedErrors;

  /** スカウトクレジット取得（企業認証） */
  @get
  @route("/credits")
  @summary("Get scout credits")
  getScoutCredits(): ScoutCreditsResponse | AuthedErrors;

  /** スカウト品質スコア取得（企業認証） */
  @get
  @route("/quality")
  @summary("Get scout quality score")
  getScoutQuality(): ScoutQualityScoreResponse | AuthedErrors;

  /** スカウトダッシュボード取得（企業認証） */
  @get
  @route("/dashboard")
  @summary("Get scout dashboard stats")
  getScoutDashboard(): ScoutDashboardResponse | AuthedErrors;

  /** スカウト詳細取得（企業認証） */
  @get
  @route("/{scoutId}")
  @summary("Get scout detail with replies")
  getCompanyScoutDetail(
    @path scoutId: Uuid,
  ): ScoutDetailResponse | AuthedNotFoundErrors;

  /** スカウトへ返信（企業認証） */
  @post
  @route("/{scoutId}/reply")
  @summary("Reply to a scout as the company")
  companyScoutReply(
    @path scoutId: Uuid,
    @body request: CompanyScoutReplyRequest,
  ): {
    @statusCode statusCode: 201;
  } | AuthedNotFoundErrors;
}
