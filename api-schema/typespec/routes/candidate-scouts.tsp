import "@typespec/http";
import "@typespec/openapi3";
import "../models/candidate-scout.tsp";
import "../models/scout.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/scouts")
@tag("CandidateScouts")
@useAuth(Models.CandidateAuth)
interface CandidateScouts {
  /** 受信スカウト一覧（要ログイン） */
  @get
  @summary("List scouts received by the candidate")
  listCandidateScouts(
    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): ScoutListResponse | AuthedErrors;

  /** 受信スカウト詳細（要ログイン） */
  @get
  @route("/{scoutId}")
  @summary("Get a received scout with replies")
  getCandidateScoutDetail(
    @path scoutId: Uuid,
  ): ScoutDetailResponse | AuthedNotFoundErrors;

  /** スカウトへ応答（interested / declined） */
  @post
  @route("/{scoutId}/respond")
  @summary("Respond to a scout")
  respondToScout(
    @path scoutId: Uuid,
    @body request: ScoutRespondRequest,
  ): ScoutRespondResponse | AuthedNotFoundErrors;

  /** スカウトへ返信（要ログイン） */
  @post
  @route("/{scoutId}/reply")
  @summary("Reply to a scout as the candidate")
  candidateScoutReply(
    @path scoutId: Uuid,
    @body request: CandidateScoutReplyRequest,
  ): {
    @statusCode statusCode: 201;
  } | AuthedNotFoundErrors;

  /** スカウト一括辞退 */
  @post
  @route("/bulk-decline")
  @summary("Bulk decline scouts")
  bulkDeclineScouts(
    @body request: BulkDeclineRequest,
  ): {
    @statusCode statusCode: 204;
  } | AuthedErrors;

  /** スカウト一括応答 */
  @post
  @route("/bulk-respond")
  @summary("Bulk respond to scouts")
  bulkRespondScouts(
    @body request: BulkRespondRequest,
  ): {
    @statusCode statusCode: 204;
  } | AuthedErrors;
}
