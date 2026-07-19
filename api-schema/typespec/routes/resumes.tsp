import "@typespec/http";
import "@typespec/openapi3";
import "../models/resume.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

// 職務経歴書PDFアップロード（候補者側）。
// 処理フロー: アップロード(pending) → 管理者がドラフト作成(reviewing) →
// 承認でプロフィール反映(approved)。admin 側の操作は routes/admin.tsp。
@route("/api/resumes")
@tag("Resumes")
@useAuth(Models.CandidateAuth)
interface Resumes {
  /** 職務経歴書PDFをアップロード（処理中のものがあれば 409） */
  @post
  @summary("Upload a resume PDF")
  uploadResume(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): {
    @statusCode statusCode: 201;
    @body upload: ResumeUploadItem;
  } | AuthedConflictErrors;

  /** 自分の最新アップロード状況を取得 */
  @get
  @route("/me")
  @summary("Get my latest resume upload")
  getMyResume(): ResumeMineResponse | AuthedErrors;
}
