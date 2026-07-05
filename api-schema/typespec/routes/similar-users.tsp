import "@typespec/http";
import "@typespec/openapi3";
import "../models/similar-users.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users/id/{userId}/similar")
@tag("SimilarUsers")
interface SimilarUsers {
  /** Work Values 診断結果に基づく類似ユーザー取得 */
  @get
  @summary("Get users with similar work values")
  getSimilarUsers(
    @path userId: string,

    /** 取得件数（1-50、デフォルト10） */
    @query limit?: int32,
  ): SimilarUsersResponse | NotFoundError;
}
