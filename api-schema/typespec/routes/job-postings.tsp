import "@typespec/http";
import "@typespec/openapi3";
import "../models/job-posting.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/jobs")
@tag("JobPostings")
@useAuth(Models.CompanyAuth)
interface CompanyJobPostings {
  /** チームメンバー写真アップロード（企業認証） */
  @post
  @route("/team-member-photo")
  @summary("Upload a team member photo")
  uploadTeamMemberPhoto(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | AuthedErrors;

  /** ギャラリー画像アップロード（企業認証） */
  @post
  @route("/gallery-image")
  @summary("Upload a gallery image")
  uploadGalleryImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | AuthedErrors;

  /** カバー画像アップロード（企業認証） */
  @post
  @route("/cover-image")
  @summary("Upload a cover image")
  uploadJobCoverImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | AuthedErrors;

  /** 求人作成（企業認証） */
  @post
  @summary("Create a job posting")
  createJobPosting(
    @body request: JobPostingRequest,
  ): {
    @statusCode statusCode: 201;
    @body job: JobPostingResponse;
  } | AuthedErrors;

  /** 自社求人一覧（企業認証） */
  @get
  @summary("List job postings of the company")
  listCompanyJobPostings(): JobPostingListResponse | AuthedErrors;

  /** 求人取得（企業認証） */
  @get
  @route("/{jobId}")
  @summary("Get a job posting")
  getCompanyJobPosting(
    @path jobId: Uuid,
  ): JobPostingResponse | AuthedNotFoundErrors;

  /** 求人更新（企業認証） */
  @put
  @route("/{jobId}")
  @summary("Update a job posting")
  updateJobPosting(
    @path jobId: Uuid,
    @body request: JobPostingRequest,
  ): JobPostingResponse | AuthedNotFoundErrors;

  /** 求人削除（企業認証） */
  @delete
  @route("/{jobId}")
  @summary("Delete a job posting")
  deleteJobPosting(
    @path jobId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedNotFoundErrors;
}

@route("/api/jobs")
@tag("JobPostings")
interface PublicJobPostings {
  /**
   * 公開求人一覧。常にページングラッパー（items/total）で返す。
   * `limit > 0` を指定すると search / category / employmentType / remotePolicy /
   * sort / valueFilters / filterMode を解釈してページングし、limit 未指定（0）のときは全件を返す。
   */
  @get
  @summary("List public job postings")
  listPublicJobPostings(
    /** 取得件数（>0 でページングモード） */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,

    /** フリーワード */
    @query search?: string,

    /** 職種カテゴリ */
    @query category?: string,

    /** 雇用形態 */
    @query employmentType?: string,

    /** リモートポリシー */
    @query remotePolicy?: string,

    /** ソートキー */
    @query sort?: JobPostingSort,

    /** Work Values フィルタ（`id:score` のカンマ区切り） */
    @pattern("^[A-Za-z0-9_-]+:[0-9]+(\\.[0-9]+)?(,[A-Za-z0-9_-]+:[0-9]+(\\.[0-9]+)?)*$")
    @query valueFilters?: string,

    /** フィルタモード（未指定時は values） */
    @query filterMode?: JobPostingFilterMode,
  ): JobPostingListResponse | BadRequestError;

  /** 公開求人取得 */
  @get
  @route("/{jobId}")
  @summary("Get a public job posting")
  getPublicJobPosting(
    @path jobId: Uuid,
  ): JobPostingResponse | NotFoundErrors;
}
