import "@typespec/http";
import "@typespec/openapi3";
import "../models/candidate-scout.tsp";
import "../models/scout.tsp";
import "../models/notification.tsp";
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

  /** 未読（未開封）スカウト数（要ログイン） */
  @get
  @route("/unread-count")
  @summary("Count unread scouts for the candidate")
  countCandidateUnreadScouts(): UnreadCountResponse | AuthedErrors;

  /** 受信スカウト詳細（要ログイン） */
  @get
  @route("/{scoutId}")
  @summary("Get a received scout with replies")
  getCandidateScoutDetail(
    @path scoutId: Uuid,
  ): ScoutDetailResponse | AuthedForbiddenErrors;

  /** スカウトへ応答（interested / declined） */
  @post
  @route("/{scoutId}/respond")
  @summary("Respond to a scout")
  respondToScout(
    @path scoutId: Uuid,
    @body request: ScoutRespondRequest,
  ): ScoutRespondResponse | AuthedForbiddenErrors;

  /** スカウトへ返信（要ログイン） */
  @post
  @route("/{scoutId}/reply")
  @summary("Reply to a scout as the candidate")
  candidateScoutReply(
    @path scoutId: Uuid,
    @body request: CandidateScoutReplyRequest,
  ): {
    @statusCode statusCode: 201;
  } | AuthedForbiddenErrors;

  /** スカウト一括辞退 */
  @post
  @route("/bulk-decline")
  @summary("Bulk decline scouts")
  bulkDeclineScouts(
    @body request: BulkDeclineRequest,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;

  /** スカウト一括応答 */
  @post
  @route("/bulk-respond")
  @summary("Bulk respond to scouts")
  bulkRespondScouts(
    @body request: BulkRespondRequest,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;
}
