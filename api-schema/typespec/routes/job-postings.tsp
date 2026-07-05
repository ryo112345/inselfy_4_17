import "@typespec/http";
import "@typespec/openapi3";
import "../models/job-posting.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/jobs")
@tag("JobPostings")
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
  ): UploadUrlResponse | BadRequestError;

  /** ギャラリー画像アップロード（企業認証） */
  @post
  @route("/gallery-image")
  @summary("Upload a gallery image")
  uploadGalleryImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | BadRequestError;

  /** カバー画像アップロード（企業認証） */
  @post
  @route("/cover-image")
  @summary("Upload a cover image")
  uploadJobCoverImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | BadRequestError;

  /** 求人作成（企業認証） */
  @post
  @summary("Create a job posting")
  createJobPosting(
    @body request: JobPostingRequest,
  ): {
    @statusCode statusCode: 201;
    @body job: JobPostingResponse;
  } | BadRequestError;

  /** 自社求人一覧（企業認証）。裸の配列を返す（互換のため） */
  @get
  @summary("List job postings of the company")
  listCompanyJobPostings(): JobPostingResponse[] | BadRequestError;

  /** 求人取得（企業認証） */
  @get
  @route("/{jobId}")
  @summary("Get a job posting")
  getCompanyJobPosting(
    @path jobId: string,
  ): JobPostingResponse | NotFoundError | BadRequestError;

  /** 求人更新（企業認証） */
  @put
  @route("/{jobId}")
  @summary("Update a job posting")
  updateJobPosting(
    @path jobId: string,
    @body request: JobPostingRequest,
  ): JobPostingResponse | BadRequestError | NotFoundError;

  /** 求人削除（企業認証） */
  @delete
  @route("/{jobId}")
  @summary("Delete a job posting")
  deleteJobPosting(
    @path jobId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;
}

@route("/api/jobs")
@tag("JobPostings")
interface PublicJobPostings {
  /**
   * 公開求人一覧。`limit > 0` を指定するとページングラッパー（items/total）で返し、
   * search / category / employmentType / remotePolicy / sort / valueFilters / filterMode を解釈する。
   * limit 未指定（0）のときは全件を裸の配列で返す（互換のため）。
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

    /** ソート（"salary" で給与順） */
    @query sort?: string,

    /** Work Values フィルタ（`id:score` のカンマ区切り） */
    @query valueFilters?: string,

    /** フィルタモード（values / needs） */
    @query filterMode?: string,
  ): JobPostingListResponse | JobPostingResponse[] | BadRequestError;

  /** 公開求人取得 */
  @get
  @route("/{jobId}")
  @summary("Get a public job posting")
  getPublicJobPosting(
    @path jobId: string,
  ): JobPostingResponse | NotFoundError | BadRequestError;
}
