import "@typespec/http";
import "@typespec/openapi3";
import "../models/talent.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/saved-candidates")
@tag("SavedCandidates")
@useAuth(Models.CompanyAuth)
interface SavedCandidates {
  /** 保存済み候補者一覧（企業認証） */
  @get
  @summary("List saved candidates")
  listSavedCandidates(
    /** 取得件数（1-100、デフォルト20） */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): TalentListResponse | BadRequestError | UnauthorizedError;

  /** 保存済み候補者数（企業認証） */
  @get
  @route("/count")
  @summary("Count saved candidates")
  countSavedCandidates(): SavedCountResponse | BadRequestError | UnauthorizedError;

  /** 保存済み一括チェック（企業認証） */
  @post
  @route("/bulk-check")
  @summary("Bulk-check whether candidates are saved")
  bulkCheckSaved(
    @body request: BulkCheckSavedRequest,
  ): BulkSavedResponse | BadRequestError | UnauthorizedError;

  /** 候補者を保存（企業認証） */
  @post
  @route("/{userId}")
  @summary("Save a candidate")
  saveCandidate(
    @path userId: string,
  ): {
    @statusCode statusCode: 204;
  } | BadRequestError | UnauthorizedError;

  /** 候補者の保存を解除（企業認証） */
  @delete
  @route("/{userId}")
  @summary("Unsave a candidate")
  unsaveCandidate(
    @path userId: string,
  ): {
    @statusCode statusCode: 204;
  } | BadRequestError | UnauthorizedError;

  /** 保存済みか確認（企業認証） */
  @get
  @route("/{userId}")
  @summary("Check whether a candidate is saved")
  isCandidateSaved(
    @path userId: string,
  ): SavedResponse | BadRequestError | UnauthorizedError;
}
