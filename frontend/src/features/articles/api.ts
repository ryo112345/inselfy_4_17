const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

export type ArticleItem = {
  id: string;
  authorType: "user" | "company";
  authorName: string;
  authorUsername?: string;
  title: string;
  body: string;
  freePreview: string;
  isPaid: boolean;
  priceYen: number;
  purchased: boolean;
  status: string;
  coverImageUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type ArticleListResponse = {
  items: ArticleItem[];
  total: number;
};

export async function fetchArticles(
  limit = 20,
  offset = 0,
): Promise<ArticleListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/articles?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchMyArticles(
  limit = 50,
  offset = 0,
): Promise<ArticleListResponse> {
  const res = await fetch(
    `${BASE_URL}/api/articles/mine?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchArticle(id: string): Promise<ArticleItem> {
  const res = await fetch(`${BASE_URL}/api/articles/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export async function createArticle(data: {
  title: string;
  body: string;
  isPaid: boolean;
  priceYen: number;
  coverImageUrl?: string | null;
  tags?: string[];
}): Promise<ArticleItem> {
  const res = await fetch(`/api/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create article");
  }
  return res.json();
}

export async function updateArticle(
  id: string,
  data: {
    title: string;
    body: string;
    isPaid: boolean;
    priceYen: number;
    coverImageUrl?: string | null;
    tags?: string[];
  },
): Promise<ArticleItem> {
  const res = await fetch(`/api/articles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to update article");
  }
  return res.json();
}

export async function publishArticle(id: string): Promise<ArticleItem> {
  const res = await fetch(`/api/articles/${id}/publish`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to publish article");
  }
  return res.json();
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`/api/articles/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete article");
}

export async function createCheckoutSession(
  articleId: string,
): Promise<{ url: string }> {
  const res = await fetch(`/api/articles/${articleId}/checkout`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create checkout session");
  }
  return res.json();
}
