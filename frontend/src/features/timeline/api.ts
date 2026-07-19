// タイムライン（投稿・コメント・いいね・リポスト）の薄いラッパー層。
// 楽観更新やページング手回しの命令的フローから呼ばれるためシグネチャを維持し、
// 内部だけ orval 生成の平関数に置き換えている。非2xx は mutator が ApiError を throw する。
import {
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
} from "@/external/client/api/orval/generated/endpoints/posts/posts";
import type {
  ModelsCommentListResponse,
  ModelsCommentResponse,
  ModelsCreatePostRequest,
  ModelsLikeToggleResponse,
  ModelsPostListResponse,
  ModelsPostResponse,
  ModelsRepostToggleResponse,
} from "@/external/client/api/orval/generated/models";
import {
  PostsCreatePostBody,
  PostsCreatePostCommentBody,
} from "@/external/client/api/orval/generated/zod/posts/posts.zod";
import { formatFieldErrors, validateForm } from "@/lib/form-validation";

export type PostItem = ModelsPostResponse;
export type PostListResponse = ModelsPostListResponse;
export type CommentItem = ModelsCommentResponse;
export type CommentListResponse = ModelsCommentListResponse;
export type LikeToggleResponse = ModelsLikeToggleResponse;
export type RepostToggleResponse = ModelsRepostToggleResponse;

export async function fetchPost(postId: string, viewerId = ""): Promise<PostItem> {
  return postsGetPost(postId, viewerId ? { viewerId } : undefined);
}

export async function fetchTimeline(
  limit = 20,
  offset = 0,
  viewerId = "",
): Promise<PostListResponse> {
  const query: { limit: number; offset: number; viewerId?: string } = { limit, offset };
  if (viewerId) query.viewerId = viewerId;
  return postsListTimelinePosts(query);
}

// userId は認証セッションからサーバ側で解決されるため送信しない（旧実装の送信分は無視されていた）
// 投稿・コメントは呼び出し元が4箇所（PostForm / compose / PostCard 引用 / CommentSection）
// あるため、送信前の zod 検証はこのラッパー層で一元的に行い、エラーは Error として投げて
// 各呼び出し元の既存 catch → setError 表示に載せる。
export async function createPost(
  _userId: string,
  content: string,
  quotePostId?: string,
): Promise<PostItem> {
  const body: ModelsCreatePostRequest = { content };
  if (quotePostId) body.quotePostId = quotePostId;
  const fieldErrors = validateForm(PostsCreatePostBody, body);
  if (fieldErrors) throw new Error(formatFieldErrors(fieldErrors, { content: "" }).join("\n"));
  return postsCreatePost(body);
}

export async function toggleRepost(postId: string): Promise<RepostToggleResponse> {
  return postsTogglePostRepost(postId);
}

export async function fetchUserPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  return postsListPostsByUser(userId, { limit, offset });
}

export async function fetchLikedPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  return postsListLikedPostsByUser(userId, { limit, offset });
}

export async function deletePost(postId: string, _userId: string): Promise<void> {
  await postsDeletePost(postId);
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  return postsTogglePostLike(postId);
}

export async function fetchComments(
  postId: string,
  limit = 20,
  offset = 0,
): Promise<CommentListResponse> {
  return postsListPostComments(postId, { limit, offset });
}

export async function createComment(postId: string, content: string): Promise<CommentItem> {
  const fieldErrors = validateForm(PostsCreatePostCommentBody, { content });
  if (fieldErrors) throw new Error(formatFieldErrors(fieldErrors, { content: "" }).join("\n"));
  return postsCreatePostComment(postId, { content });
}
