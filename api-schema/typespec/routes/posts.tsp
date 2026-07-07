import "@typespec/http";
import "@typespec/openapi3";
import "../models/post.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/posts")
@tag("Posts")
interface Posts {
  /** 投稿作成（要ログイン） */
  @post
  @summary("Create a post")
  @useAuth(Models.CandidateAuth)
  createPost(
    @body request: CreatePostRequest,
  ): {
    @statusCode statusCode: 201;
    @body post: PostResponse;
  } | AuthedNotFoundErrors;

  /** タイムライン取得 */
  @get
  @summary("List timeline posts")
  listTimelinePosts(
    /** 閲覧者ユーザーID（いいね済み判定に使用） */
    @query viewerId?: Uuid,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): PostListResponse | BadRequestError;

  /** ユーザーの投稿一覧 */
  @get
  @route("/users/{userId}")
  @summary("List posts by a user")
  listPostsByUser(
    @path userId: Uuid,
    @query viewerId?: Uuid,
    @query limit?: int32,
    @query offset?: int32,
  ): PostListResponse | NotFoundErrors;

  /** ユーザーがいいねした投稿一覧 */
  @get
  @route("/users/{userId}/likes")
  @summary("List posts liked by a user")
  listLikedPostsByUser(
    @path userId: Uuid,
    @query limit?: int32,
    @query offset?: int32,
  ): PostListResponse | NotFoundErrors;

  /** 投稿取得 */
  @get
  @route("/{postId}")
  @summary("Get a post")
  getPost(
    @path postId: Uuid,
    @query viewerId?: Uuid,
  ): PostResponse | NotFoundErrors;

  /** 投稿削除（要ログイン） */
  @delete
  @route("/{postId}")
  @summary("Delete a post")
  @useAuth(Models.CandidateAuth)
  deletePost(
    @path postId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;

  /** いいねトグル（要ログイン） */
  @post
  @route("/{postId}/like")
  @summary("Toggle like on a post")
  @useAuth(Models.CandidateAuth)
  togglePostLike(
    @path postId: Uuid,
  ): LikeToggleResponse | AuthedNotFoundErrors;

  /** リポストトグル（要ログイン） */
  @post
  @route("/{postId}/repost")
  @summary("Toggle repost on a post")
  @useAuth(Models.CandidateAuth)
  togglePostRepost(
    @path postId: Uuid,
  ): RepostToggleResponse | AuthedNotFoundErrors;

  /** コメント一覧 */
  @get
  @route("/{postId}/comments")
  @summary("List comments on a post")
  listPostComments(
    @path postId: Uuid,
    @query limit?: int32,
    @query offset?: int32,
  ): CommentListResponse | NotFoundErrors;

  /** コメント作成（要ログイン） */
  @post
  @route("/{postId}/comments")
  @summary("Create a comment on a post")
  @useAuth(Models.CandidateAuth)
  createPostComment(
    @path postId: Uuid,
    @body request: CreateCommentRequest,
  ): {
    @statusCode statusCode: 201;
    @body comment: CommentResponse;
  } | AuthedNotFoundErrors;

  /** コメント削除（要ログイン） */
  @delete
  @route("/comments/{commentId}")
  @summary("Delete a comment")
  @useAuth(Models.CandidateAuth)
  deletePostComment(
    @path commentId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;
}
