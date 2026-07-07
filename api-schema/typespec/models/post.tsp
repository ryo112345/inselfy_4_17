import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 投稿作成リクエスト */
model CreatePostRequest {
  /** 本文 */
  @maxLength(280)
  content: string;

  /** 引用元投稿ID */
  quotePostId?: Uuid;
}

/** コメント作成リクエスト */
model CreateCommentRequest {
  /** 本文 */
  @maxLength(500)
  content: string;
}

/** 引用投稿（要約） */
model QuotedPostResponse {
  /** 投稿ID */
  id: Uuid;

  /** 本文 */
  content: string;

  /** 投稿者ユーザー名 */
  username: string;

  /** 投稿者表示名 */
  name: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 投稿 */
model PostResponse {
  /** 投稿ID */
  id: Uuid;

  /** 投稿者ユーザーID */
  userId: Uuid;

  /** 投稿者ユーザー名 */
  username: string;

  /** 投稿者表示名 */
  name: string;

  /** 本文 */
  content: string;

  /** いいね数 */
  likeCount: integer;

  /** コメント数 */
  commentCount: integer;

  /** リポスト数 */
  repostCount: integer;

  /** 自分がいいね済みか */
  likedByMe: boolean;

  /** 自分がリポスト済みか */
  repostedByMe: boolean;

  /** リポストか */
  isRepost: boolean;

  /** 引用元投稿 */
  quotedPost?: QuotedPostResponse;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 投稿一覧 */
model PostListResponse is ListResponse<PostResponse>;

/** いいねトグル結果 */
model LikeToggleResponse {
  /** いいね状態 */
  liked: boolean;

  /** いいね数 */
  count: integer;
}

/** リポストトグル結果 */
model RepostToggleResponse {
  /** リポスト状態 */
  reposted: boolean;

  /** リポスト数 */
  count: integer;
}

/** コメント */
model CommentResponse {
  /** コメントID */
  id: Uuid;

  /** 投稿ID */
  postId: Uuid;

  /** コメント投稿者ユーザーID */
  userId: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 本文 */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** コメント一覧 */
model CommentListResponse is ListResponse<CommentResponse>;
