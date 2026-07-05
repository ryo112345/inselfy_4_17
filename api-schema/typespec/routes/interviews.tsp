import "@typespec/http";
import "@typespec/openapi3";
import "../models/interview.tsp";
import "../models/job-application.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/interviews")
@tag("Interviews")
interface CompanyInterviews {
  /** 面接日程を提案（企業認証） */
  @post
  @route("/propose")
  @summary("Propose interview slots")
  proposeInterview(
    @body request: ProposeInterviewRequest,
  ): {
    @statusCode statusCode: 201;
    @body result: ProposeInterviewResponse;
  } | BadRequestError | NotFoundError;

  /** 応募に未回答の提案があるか確認（企業認証） */
  @get
  @route("/pending/{applicationId}")
  @summary("Check for a pending proposal on an application")
  getPendingProposal(
    @path applicationId: string,
  ): PendingProposalCheckResponse | BadRequestError;

  /** 期間内の面接一覧（企業認証） */
  @get
  @summary("List interviews for the company in a date range")
  listCompanyInterviews(
    /** 開始日（YYYY-MM-DD、デフォルト今日） */
    @query from?: string,

    /** 終了日（YYYY-MM-DD、デフォルト from+7日） */
    @query to?: string,
  ): CompanyInterviewListResponse | BadRequestError;

  /** 面接キャンセル（企業認証） */
  @post
  @route("/{interviewId}/cancel")
  @summary("Cancel an interview as the company")
  cancelCompanyInterview(
    @path interviewId: string,
  ): StatusOkResponse | UnauthorizedError | NotFoundError | BadRequestError;
}

@route("/api/interviews")
@tag("Interviews")
interface CandidateInterviews {
  /** 面接・未回答提案の一覧（要ログイン） */
  @get
  @summary("List interviews and pending proposals for the candidate")
  listCandidateInterviews(): CandidateInterviewListResponse | BadRequestError;

  /** 提案スロットを選択して面接確定（要ログイン） */
  @post
  @route("/proposals/{proposalId}/select")
  @summary("Select an interview slot")
  selectInterviewSlot(
    @path proposalId: string,
    @body request: SelectSlotRequest,
  ): SelectSlotResponse | BadRequestError | NotFoundError | ConflictError;

  /** 提案のスロット一覧取得（要ログイン） */
  @get
  @route("/proposals/{proposalId}/slots")
  @summary("Get slots of a proposal")
  getProposalSlots(
    @path proposalId: string,
  ): ProposalSlotsResponse | NotFoundError | BadRequestError;

  /** 面接キャンセル（要ログイン） */
  @post
  @route("/{interviewId}/cancel")
  @summary("Cancel an interview as the candidate")
  cancelCandidateInterview(
    @path interviewId: string,
  ): StatusOkResponse | UnauthorizedError | NotFoundError | BadRequestError;
}
