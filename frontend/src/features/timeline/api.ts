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

export type PostItem = ModelsPostResponse;
export type PostListResponse = ModelsPostListResponse;
export type CommentItem = ModelsCommentResponse;
export type CommentListResponse = ModelsCommentListResponse;
export type LikeToggleResponse = ModelsLikeToggleResponse;
export type RepostToggleResponse = ModelsRepostToggleResponse;

export async function fetchPost(postId: string, viewerId = ""): Promise<PostItem> {
  const { data, error } = await postsGetPost({
    path: { postId },
    query: viewerId ? { viewerId } : undefined,
  });
  if (error || !data) throw new Error("Failed to fetch post");
  return data;
}

export async function fetchTimeline(
  limit = 20,
  offset = 0,
  viewerId = "",
): Promise<PostListResponse> {
  const query: { limit: number; offset: number; viewerId?: string } = { limit, offset };
  if (viewerId) query.viewerId = viewerId;
  const { data, error } = await postsListTimelinePosts({ query });
  if (error || !data) throw new Error("Failed to fetch timeline");
  return data;
}

// userId は認証セッションからサーバ側で解決されるため送信しない（旧実装の送信分は無視されていた）
export async function createPost(
  _userId: string,
  content: string,
  quotePostId?: string,
): Promise<PostItem> {
  const body: ModelsCreatePostRequest = { content };
  if (quotePostId) body.quotePostId = quotePostId;
  const { data, error } = await postsCreatePost({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create post");
  }
  return data;
}

export async function toggleRepost(postId: string): Promise<RepostToggleResponse> {
  const { data, error } = await postsTogglePostRepost({ path: { postId } });
  if (error || !data) throw new Error("Failed to toggle repost");
  return data;
}

export async function fetchUserPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  const { data, error } = await postsListPostsByUser({
    path: { userId },
    query: { limit, offset },
  });
  if (error || !data) throw new Error("Failed to fetch user posts");
  return data;
}

export async function fetchLikedPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  const { data, error } = await postsListLikedPostsByUser({
    path: { userId },
    query: { limit, offset },
  });
  if (error || !data) throw new Error("Failed to fetch liked posts");
  return data;
}

export async function deletePost(postId: string, _userId: string): Promise<void> {
  const { error } = await postsDeletePost({ path: { postId } });
  if (error) throw new Error("Failed to delete post");
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  const { data, error } = await postsTogglePostLike({ path: { postId } });
  if (error || !data) throw new Error("Failed to toggle like");
  return data;
}

export async function fetchComments(
  postId: string,
  limit = 20,
  offset = 0,
): Promise<CommentListResponse> {
  const { data, error } = await postsListPostComments({
    path: { postId },
    query: { limit, offset },
  });
  if (error || !data) throw new Error("Failed to fetch comments");
  return data;
}

export async function createComment(postId: string, content: string): Promise<CommentItem> {
  const { data, error } = await postsCreatePostComment({
    path: { postId },
    body: { content },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create comment");
  }
  return data;
}
