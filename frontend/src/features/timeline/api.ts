import "@/external/client/api/client";
import {
  type ModelsCommentListResponse,
  type ModelsCommentResponse,
  type ModelsCreatePostRequest,
  type ModelsLikeToggleResponse,
  type ModelsPostListResponse,
  type ModelsPostResponse,
  type ModelsRepostToggleResponse,
  postsCreatePost,
  postsCreatePostComment,
  postsDeletePost,
  postsGetPost,
  postsListLikedPostsByUser,
  postsListPostComments,
  postsListPostsByUser,
  postsListTimelinePosts,
  postsTogglePostLike,
  postsTogglePostRepost,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";

export type PostItem = ModelsPostResponse;
export type PostListResponse = ModelsPostListResponse;
export type CommentItem = ModelsCommentResponse;
export type CommentListResponse = ModelsCommentListResponse;
export type LikeToggleResponse = ModelsLikeToggleResponse;
export type RepostToggleResponse = ModelsRepostToggleResponse;

export async function fetchPost(postId: string, viewerId = ""): Promise<PostItem> {
  return run(
    postsGetPost({
      path: { postId },
      query: viewerId ? { viewerId } : undefined,
    }),
    "Failed to fetch post",
  );
}

export async function fetchTimeline(
  limit = 20,
  offset = 0,
  viewerId = "",
): Promise<PostListResponse> {
  const query: { limit: number; offset: number; viewerId?: string } = { limit, offset };
  if (viewerId) query.viewerId = viewerId;
  return run(postsListTimelinePosts({ query }), "Failed to fetch timeline");
}

// userId は認証セッションからサーバ側で解決されるため送信しない（旧実装の送信分は無視されていた）
export async function createPost(
  _userId: string,
  content: string,
  quotePostId?: string,
): Promise<PostItem> {
  const body: ModelsCreatePostRequest = { content };
  if (quotePostId) body.quotePostId = quotePostId;
  return run(postsCreatePost({ body }), "Failed to create post");
}

export async function toggleRepost(postId: string): Promise<RepostToggleResponse> {
  return run(postsTogglePostRepost({ path: { postId } }), "Failed to toggle repost");
}

export async function fetchUserPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  return run(
    postsListPostsByUser({
      path: { userId },
      query: { limit, offset },
    }),
    "Failed to fetch user posts",
  );
}

export async function fetchLikedPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  return run(
    postsListLikedPostsByUser({
      path: { userId },
      query: { limit, offset },
    }),
    "Failed to fetch liked posts",
  );
}

export async function deletePost(postId: string, _userId: string): Promise<void> {
  await run(postsDeletePost({ path: { postId } }), "Failed to delete post");
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  return run(postsTogglePostLike({ path: { postId } }), "Failed to toggle like");
}

export async function fetchComments(
  postId: string,
  limit = 20,
  offset = 0,
): Promise<CommentListResponse> {
  return run(
    postsListPostComments({
      path: { postId },
      query: { limit, offset },
    }),
    "Failed to fetch comments",
  );
}

export async function createComment(postId: string, content: string): Promise<CommentItem> {
  return run(
    postsCreatePostComment({
      path: { postId },
      body: { content },
    }),
    "Failed to create comment",
  );
}
