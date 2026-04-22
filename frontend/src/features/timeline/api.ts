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
  createdAt: string;
  updatedAt: string;
};

export type PostListResponse = {
  items: PostItem[];
  total: number;
};

export async function fetchTimeline(
  limit = 20,
  offset = 0,
): Promise<PostListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/posts?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
}

export async function createPost(
  userId: string,
  content: string,
): Promise<PostItem> {
  const res = await fetch(`/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create post");
  }
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

export async function deletePost(
  postId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`/api/posts/${postId}?userId=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}
