import "@/external/client/api/client";
import {
  articlesCreateArticle,
  articlesCreateArticleCheckout,
  articlesDeleteArticle,
  articlesGetArticle,
  articlesListArticles,
  articlesListMyArticles,
  articlesPublishArticle,
  articlesUpdateArticle,
  articlesUploadArticleImage,
  type ModelsArticleListResponse,
  type ModelsArticleResponse,
  type ModelsCreateArticleRequest,
  type ModelsUpdateArticleRequest,
} from "@/external/client/api/generated";

export type ArticleItem = ModelsArticleResponse;
export type ArticleListResponse = ModelsArticleListResponse;

export async function fetchArticles(limit = 20, offset = 0): Promise<ArticleListResponse> {
  const { data, error } = await articlesListArticles({ query: { limit, offset } });
  if (error || !data) throw new Error("Failed to fetch articles");
  return data;
}

export async function fetchMyArticles(limit = 50, offset = 0): Promise<ArticleListResponse> {
  const { data, error } = await articlesListMyArticles({ query: { limit, offset } });
  if (error || !data) throw new Error("Failed to fetch articles");
  return data;
}

export async function fetchArticle(id: string, opts?: { cookie?: string }): Promise<ArticleItem> {
  const { data, error } = await articlesGetArticle({
    path: { articleId: id },
    headers: opts?.cookie ? { cookie: opts.cookie } : undefined,
  });
  if (error || !data) throw new Error("Failed to fetch article");
  return data;
}

export async function createArticle(data: {
  title: string;
  body: string;
  isPaid: boolean;
  priceYen: number;
  coverImageUrl?: string | null;
  tags?: string[];
}): Promise<ArticleItem> {
  const { data: created, error } = await articlesCreateArticle({
    body: data as ModelsCreateArticleRequest,
  });
  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create article");
  }
  return created;
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
  const { data: updated, error } = await articlesUpdateArticle({
    path: { articleId: id },
    body: data as ModelsUpdateArticleRequest,
  });
  if (error || !updated) {
    throw new Error(error?.message ?? "Failed to update article");
  }
  return updated;
}

export async function publishArticle(id: string): Promise<ArticleItem> {
  const { data, error } = await articlesPublishArticle({ path: { articleId: id } });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to publish article");
  }
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await articlesDeleteArticle({ path: { articleId: id } });
  if (error) throw new Error("Failed to delete article");
}

export async function createCheckoutSession(articleId: string): Promise<{ url: string }> {
  const { data, error } = await articlesCreateArticleCheckout({ path: { articleId } });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create checkout session");
  }
  return data;
}

export async function uploadArticleImage(file: File): Promise<string> {
  const { data, error } = await articlesUploadArticleImage({ body: { file } });
  if (error || !data) throw new Error("Failed to upload image");
  return data.url;
}
