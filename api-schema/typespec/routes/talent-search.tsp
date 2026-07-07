import "@typespec/http";
import "@typespec/openapi3";
import "../models/talent.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

/**
 * 人材検索。以下の固定クエリに加えて、動的なカスタム重みパラメータを受け付ける:
 * - `wv_<valueId>`: Work Values の value ごとの希望 display score（diagnostic 系）
 * - `ci_<typeId>`: Career Interest の RIASEC タイプごとの重み（ci / integrated 系）
 * これらは OpenAPI では表現できないため、この説明で仕様を規定する。
 */
@route("/api/company/talents/search")
@tag("TalentSearch")
@useAuth(Models.CompanyAuth)
interface TalentSearch {
  /** 条件検索（企業認証） */
  @get
  @summary("Search talents by conditions")
  searchTalents(
    /** フリーワード */
    @query q?: string,

    /** 居住地 */
    @query location?: string,

    /** 業界 */
    @query industry?: string,

    /** 求職ステータス */
    @query job_seeking_status?: string,

    /** 職種 */
    @query job_type?: string,

    /** 診断済みのみ（"1" で有効） */
    @query diagnosed?: string,

    /** スキル（カンマ区切り） */
    @query skills?: string,

    /** 取得件数（1-200、デフォルト20） */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): TalentListResponse | BadRequestError | UnauthorizedError;

  /** Work Values 診断マッチング検索（企業認証）。`wv_<valueId>` カスタム重み対応 */
  @get
  @route("/diagnostic")
  @summary("Search talents by work-values similarity")
  diagnosticSearchTalents(
    /** 比較対象チームID */
    @query team_id?: string,

    @query q?: string,
    @query location?: string,
    @query industry?: string,
    @query job_seeking_status?: string,
    @query job_type?: string,
    @query diagnosed?: string,
    @query skills?: string,
    @query limit?: int32,
    @query offset?: int32,
  ): TalentListResponse | BadRequestError | UnauthorizedError;

  /** Career Interest 診断マッチング検索（企業認証）。`ci_<typeId>` カスタム重み対応 */
  @get
  @route("/diagnostic/ci")
  @summary("Search talents by career-interest similarity")
  ciDiagnosticSearchTalents(
    @query team_id?: string,
    @query q?: string,
    @query location?: string,
    @query industry?: string,
    @query job_seeking_status?: string,
    @query job_type?: string,
    @query diagnosed?: string,
    @query skills?: string,
    @query limit?: int32,
    @query offset?: int32,
  ): TalentListResponse | BadRequestError | UnauthorizedError;

  /** 統合診断マッチング検索（企業認証）。`wv_*` / `ci_*` カスタム重み対応 */
  @get
  @route("/diagnostic/integrated")
  @summary("Search talents by integrated similarity")
  integratedDiagnosticSearchTalents(
    @query team_id?: string,
    @query q?: string,
    @query location?: string,
    @query industry?: string,
    @query job_seeking_status?: string,
    @query job_type?: string,
    @query diagnosed?: string,
    @query skills?: string,
    @query limit?: int32,
    @query offset?: int32,
  ): TalentListResponse | BadRequestError | UnauthorizedError;
}
