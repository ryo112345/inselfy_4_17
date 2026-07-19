import "@typespec/http";
import "@typespec/openapi3";
import "../models/admin.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

// 管理コンソール用 API。全 operation が X-Admin-Key（AdminAuth）必須。
// 認可はスペック駆動（OpenAPIRequestValidator の AuthenticationFunc）。
@route("/api/admin")
@tag("Admin")
@useAuth(Models.AdminAuth)
interface Admin {
  /** 管理者一覧取得 */
  @get
  @route("/admins")
  @summary("List admins")
  listAdmins(): AdminListResponse | AuthedErrors;

  /** 管理者作成 */
  @post
  @route("/admins")
  @summary("Create an admin")
  createAdmin(@body request: CreateAdminRequest): {
    @statusCode statusCode: 201;
    @body admin: AdminItem;
  } | AuthedErrors;

  /** 個人APIトークン発行（トークンは一度だけ返る） */
  @post
  @route("/admins/{adminId}/api-key")
  @summary("Issue a personal API token for an admin")
  issueAdminApiKey(
    @path adminId: Uuid,
  ): AdminIssueKeyResponse | AuthedNotFoundErrors;

  /** 管理者削除 */
  @delete
  @route("/admins/{adminId}")
  @summary("Delete an admin")
  deleteAdmin(@path adminId: Uuid): {
    @statusCode statusCode: 204;
  } | AuthedErrors;

  /** ユーザー一覧取得（ページング・検索付き） */
  @get
  @route("/users")
  @summary("List users for the admin console")
  listUsers(
    /** ページ番号（1始まり、デフォルト1） */
    @query page?: int32,

    /** 1ページあたり件数（1〜100、デフォルト20） */
    @query per_page?: int32,

    /** ユーザー名・表示名・メールの部分一致検索 */
    @query q?: string,
  ): AdminUserListResponse | AuthedErrors;

  /** ユーザー削除 */
  @delete
  @route("/users/{userId}")
  @summary("Delete a user")
  deleteUser(@path userId: Uuid): {
    @statusCode statusCode: 204;
  } | AuthedErrors;

  /** ユーザーとして成り代わりログイン（cookie を焼く） */
  @post
  @route("/users/{userId}/bypass-login")
  @summary("Log in as a user (bypass)")
  bypassLoginAsUser(
    @path userId: Uuid,
  ): AdminUserBypassLoginResponse | AuthedNotFoundErrors;

  /** 企業一覧取得（ページング・ステータス絞り込み付き） */
  @get
  @route("/companies")
  @summary("List company accounts for the admin console")
  listCompanies(
    /** ページ番号（1始まり、デフォルト1） */
    @query page?: int32,

    /** 1ページあたり件数（1〜100、デフォルト20） */
    @query per_page?: int32,

    /** 承認ステータスでの絞り込み */
    @query status?: CompanyStatus,
  ): AdminCompanyListResponse | AuthedErrors;

  /** 企業の承認ステータス更新 */
  @patch
  @route("/companies/{companyId}/status")
  @summary("Update a company's approval status")
  updateCompanyStatus(
    @path companyId: Uuid,
    @body request: UpdateCompanyStatusRequest,
  ): AdminCompanyItem | AuthedNotFoundErrors;

  /** 企業として成り代わりログイン（cookie を焼く） */
  @post
  @route("/companies/{companyId}/bypass-login")
  @summary("Log in as a company (bypass)")
  bypassLoginAsCompany(
    @path companyId: Uuid,
  ): AdminCompanyBypassLoginResponse | AuthedNotFoundErrors;

  // --- 職務経歴書アップロード ---

  /** 職務経歴書アップロード一覧（ステータス絞り込み付き） */
  @get
  @route("/resumes")
  @summary("List resume uploads")
  listResumes(
    /** ステータスでの絞り込み */
    @query status?: ResumeUploadStatus,
  ): AdminResumeListResponse | AuthedErrors;

  /** 職務経歴書PDFダウンロード */
  @get
  @route("/resumes/{resumeId}/download")
  @summary("Download a resume PDF")
  downloadResume(@path resumeId: Uuid): {
    @header contentType: "application/pdf";
    @body body: bytes;
  } | AuthedNotFoundErrors;

  /** 職務経歴書ドラフト取得 */
  @get
  @route("/resumes/{resumeId}/draft")
  @summary("Get a resume profile draft")
  getResumeDraft(
    @path resumeId: Uuid,
  ): AdminResumeDraftResponse | AuthedNotFoundErrors;

  /** 職務経歴書ドラフト保存（バリデーション成功で reviewing に遷移） */
  @put
  @route("/resumes/{resumeId}/draft")
  @summary("Save a resume profile draft")
  saveResumeDraft(
    @path resumeId: Uuid,
    @body request: unknown,
  ): AdminResumeDraftSaveResponse | AuthedConflictErrors;

  /** 職務経歴書を承認しプロフィールへ反映 */
  @post
  @route("/resumes/{resumeId}/approve")
  @summary("Approve a resume draft and apply it to the profile")
  approveResume(@path resumeId: Uuid): AdminResumeItem | AuthedConflictErrors;

  /** 職務経歴書を却下 */
  @post
  @route("/resumes/{resumeId}/reject")
  @summary("Reject a resume upload")
  rejectResume(@path resumeId: Uuid): AdminResumeItem | AuthedConflictErrors;

  // --- Work Values AIレポート ---

  /** AIレポート未生成の Work Values セッション一覧 */
  @get
  @route("/reports/pending")
  @summary("List Work Values sessions without an AI report")
  listPendingWvSessions(): AdminPendingSessionsResponse | AuthedErrors;

  /** 生成済み Work Values AIレポート一覧 */
  @get
  @route("/reports/list")
  @summary("List generated Work Values AI reports")
  listWvReports(): AdminAiReportListResponse | AuthedErrors;

  /** Work Values AIレポートの閲覧済みフラグをリセット */
  @post
  @route("/sessions/{sessionId}/reset-viewed")
  @summary("Reset the viewed flag of a Work Values AI report")
  resetWvReportViewed(
    @path sessionId: Uuid,
  ): AdminMessageResponse | AuthedErrors;

  /** Work Values AIレポート保存（upsert） */
  @put
  @route("/sessions/{sessionId}/ai-report")
  @summary("Save a Work Values AI report")
  saveWvReport(
    @path sessionId: Uuid,
    @body request: AdminSaveReportRequest,
  ): AdminSavedAiReportResponse | AuthedNotFoundErrors;

  /** Work Values AIレポート取得 */
  @get
  @route("/sessions/{sessionId}/ai-report")
  @summary("Get a Work Values AI report")
  getWvReport(@path sessionId: Uuid): AiReportResponse | AuthedNotFoundErrors;

  /** Work Values セッションのスコア取得（レポート生成用） */
  @get
  @route("/sessions/{sessionId}/scores")
  @summary("Get the raw scores of a Work Values session")
  getWvSessionScores(
    @path sessionId: Uuid,
  ): AdminSessionScoresResponse | AuthedNotFoundErrors;

  /** Work Values レポート生成用プロンプト取得 */
  @get
  @route("/sessions/{sessionId}/prompt")
  @summary("Get the report-generation prompt for a Work Values session")
  getWvPrompt(@path sessionId: Uuid): AdminPromptResponse | AuthedNotFoundErrors;

  // --- Career Interest AIレポート ---

  /** AIレポート未生成の Career Interest セッション一覧 */
  @get
  @route("/ci-reports/pending")
  @summary("List Career Interest sessions without an AI report")
  listPendingCiSessions(): AdminPendingSessionsResponse | AuthedErrors;

  /** 生成済み Career Interest AIレポート一覧 */
  @get
  @route("/ci-reports/list")
  @summary("List generated Career Interest AI reports")
  listCiReports(): AdminAiReportListResponse | AuthedErrors;

  /** Career Interest AIレポートの閲覧済みフラグをリセット */
  @post
  @route("/ci-sessions/{sessionId}/reset-viewed")
  @summary("Reset the viewed flag of a Career Interest AI report")
  resetCiReportViewed(
    @path sessionId: Uuid,
  ): AdminMessageResponse | AuthedErrors;

  /** Career Interest AIレポート保存（upsert） */
  @put
  @route("/ci-sessions/{sessionId}/ai-report")
  @summary("Save a Career Interest AI report")
  saveCiReport(
    @path sessionId: Uuid,
    @body request: AdminSaveReportRequest,
  ): AdminSavedAiReportResponse | AuthedNotFoundErrors;

  /** Career Interest AIレポート取得 */
  @get
  @route("/ci-sessions/{sessionId}/ai-report")
  @summary("Get a Career Interest AI report")
  getCiReport(@path sessionId: Uuid): AiReportResponse | AuthedNotFoundErrors;

  /** Career Interest レポート生成用プロンプト取得 */
  @get
  @route("/ci-sessions/{sessionId}/prompt")
  @summary("Get the report-generation prompt for a Career Interest session")
  getCiPrompt(@path sessionId: Uuid): AdminPromptResponse | AuthedNotFoundErrors;

  // --- 統合レポート ---

  /** 統合レポート未生成のリクエスト一覧 */
  @get
  @route("/integrated-reports/pending")
  @summary("List integrated report requests without a report")
  listPendingIntegratedRequests(): AdminPendingIntegratedRequestsResponse | AuthedErrors;

  /** 生成済み統合レポート一覧 */
  @get
  @route("/integrated-reports/list")
  @summary("List generated integrated reports")
  listIntegratedReports(): AdminIntegratedReportListResponse | AuthedErrors;

  /** 統合レポートの閲覧済みフラグをリセット */
  @post
  @route("/integrated-requests/{requestId}/reset-viewed")
  @summary("Reset the viewed flag of an integrated report")
  resetIntegratedReportViewed(
    @path requestId: Uuid,
  ): AdminMessageResponse | AuthedErrors;

  /** 統合レポート保存（upsert） */
  @put
  @route("/integrated-requests/{requestId}/ai-report")
  @summary("Save an integrated report")
  saveIntegratedReport(
    @path requestId: Uuid,
    @body request: AdminSaveReportRequest,
  ): AdminSavedIntegratedReportResponse | AuthedNotFoundErrors;

  /** 統合レポート取得 */
  @get
  @route("/integrated-requests/{requestId}/ai-report")
  @summary("Get an integrated report")
  getIntegratedReportAsAdmin(
    @path requestId: Uuid,
  ): IntegratedReportResponse | AuthedNotFoundErrors;

  /** 統合レポート生成用プロンプト取得 */
  @get
  @route("/integrated-requests/{requestId}/prompt")
  @summary("Get the report-generation prompt for an integrated report request")
  getIntegratedPrompt(
    @path requestId: Uuid,
  ): AdminPromptResponse | AuthedNotFoundErrors;
}
