import "@typespec/http";
import "@typespec/openapi3";
import "../models/follow.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users/{username}")
@tag("Follows")
interface Follows {
  /** フォローする（要ログイン） */
  @post
  @route("/follow")
  @summary("Follow a user")
  followUser(
    @path username: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError | ConflictError;

  /** フォロー解除（要ログイン） */
  @delete
  @route("/follow")
  @summary("Unfollow a user")
  unfollowUser(
    @path username: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** フォロワー一覧 */
  @get
  @route("/followers")
  @summary("List followers of a user")
  listFollowers(
    @path username: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): FollowUserListResponse | NotFoundError | BadRequestError;

  /** フォロー中一覧 */
  @get
  @route("/following")
  @summary("List users a user is following")
  listFollowing(
    @path username: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): FollowUserListResponse | NotFoundError | BadRequestError;

  /** フォロー状態取得（要ログイン） */
  @get
  @route("/follow-status")
  @summary("Get follow status between the authenticated user and a user")
  getFollowStatus(
    @path username: string,
  ): FollowStatusResponse | NotFoundError | BadRequestError;
}
