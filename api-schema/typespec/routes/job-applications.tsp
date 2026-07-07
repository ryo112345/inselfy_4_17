import "@typespec/http";
import "@typespec/openapi3";
import "../models/job-application.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/applications")
@tag("JobApplications")
@useAuth(Models.CandidateAuth)
interface CandidateApplications {
  /** 求人へ応募（要ログイン） */
  @post
  @summary("Apply to a job posting")
  applyToJob(
    @body request: ApplyJobRequest,
  ): {
    @statusCode statusCode: 201;
    @body application: JobApplicationResponse;
  } | BadRequestError | NotFoundError | ConflictError | UnauthorizedError;

  /** 自分の応募一覧（要ログイン） */
  @get
  @summary("List applications by the candidate")
  listCandidateApplications(): JobApplicationListResponse | BadRequestError | UnauthorizedError;

  /** 応募済みチェック（要ログイン） */
  @get
  @route("/check")
  @summary("Check whether the candidate has applied to a job")
  checkApplied(
    /** 求人ID */
    @query jobPostingId: string,
  ): AppliedResponse | BadRequestError | UnauthorizedError;

  /** 応募取り下げ（要ログイン） */
  @post
  @route("/{applicationId}/withdraw")
  @summary("Withdraw an application")
  withdrawApplication(
    @path applicationId: string,
  ): StatusOkResponse | NotFoundError | BadRequestError | UnauthorizedError;
}

@route("/api/company/applications")
@tag("JobApplications")
@useAuth(Models.CompanyAuth)
interface CompanyApplications {
  /** 企業への応募一覧（企業認証） */
  @get
  @summary("List applications for the company")
  listCompanyApplications(
    /** ステータスで絞り込み */
    @query status?: string,

    /** 求人IDで絞り込み */
    @query job_posting_id?: string,

    /** キーワード検索 */
    @query keyword?: string,

    /** 応募日時 from（RFC3339） */
    @query date_from?: string,

    /** 応募日時 to（RFC3339） */
    @query date_to?: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): JobApplicationListResponse | BadRequestError | UnauthorizedError;

  /** 応募詳細（企業認証） */
  @get
  @route("/{applicationId}")
  @summary("Get an application")
  getApplication(
    @path applicationId: string,
  ): JobApplicationResponse | NotFoundError | BadRequestError | UnauthorizedError;

  /** 応募ステータス更新（企業認証） */
  @patch
  @route("/{applicationId}/status")
  @summary("Update application status")
  updateApplicationStatus(
    @path applicationId: string,
    @body request: UpdateApplicationStatusRequest,
  ): StatusOkResponse | BadRequestError | NotFoundError | UnauthorizedError;
}
