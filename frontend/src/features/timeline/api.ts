const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

export type PostItem = {
  id: string;
  userId: string;
  username: string;
  name: string;
  content: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByMe: boolean;
  repostedByMe: boolean;
  isRepost: boolean;
  quotedPost?: {
    id: string;
    content: string;
    username: string;
    name: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PostListResponse = {
  items: PostItem[];
  total: number;
};

export type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  name: string;
  content: string;
  createdAt: string;
};

export type CommentListResponse = {
  items: CommentItem[];
  total: number;
};

export type LikeToggleResponse = {
  liked: boolean;
  count: number;
};

export type RepostToggleResponse = {
  reposted: boolean;
  count: number;
};

export async function fetchPost(
  postId: string,
  viewerId = "",
): Promise<PostItem> {
  const params = new URLSearchParams();
  if (viewerId) params.set("viewerId", viewerId);
  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/api/posts/${postId}${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

export async function fetchTimeline(
  limit = 20,
  offset = 0,
  viewerId = "",
): Promise<PostListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (viewerId) params.set("viewerId", viewerId);
  const res = await fetch(`${BASE_URL}/api/posts?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
}

export async function createPost(
  userId: string,
  content: string,
  quotePostId?: string,
): Promise<PostItem> {
  const body: Record<string, string> = { userId, content };
  if (quotePostId) body.quotePostId = quotePostId;
  const res = await fetch(`/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create post");
  }
  return res.json();
}

export async function toggleRepost(postId: string): Promise<RepostToggleResponse> {
  const res = await fetch(`/api/posts/${postId}/repost`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to toggle repost");
  return res.json();
}

export async function fetchUserPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/posts/users/${userId}?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch user posts");
  return res.json();
}

export async function fetchLikedPosts(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/posts/users/${userId}/likes?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch liked posts");
  return res.json();
}

export async function deletePost(
  postId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`/api/posts/${postId}?userId=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  const res = await fetch(`/api/posts/${postId}/like`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

export async function fetchComments(
  postId: string,
  limit = 20,
  offset = 0,
): Promise<CommentListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/posts/${postId}/comments?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function createComment(
  postId: string,
  content: string,
): Promise<CommentItem> {
  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create comment");
  }
  return res.json();
}
