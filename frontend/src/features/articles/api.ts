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
import { run } from "@/lib/api-result";

export type ArticleItem = ModelsArticleResponse;
export type ArticleListResponse = ModelsArticleListResponse;

export async function fetchArticles(limit = 20, offset = 0): Promise<ArticleListResponse> {
  return run(articlesListArticles({ query: { limit, offset } }), "Failed to fetch articles");
}

export async function fetchMyArticles(limit = 50, offset = 0): Promise<ArticleListResponse> {
  return run(articlesListMyArticles({ query: { limit, offset } }), "Failed to fetch articles");
}

export async function fetchArticle(id: string, opts?: { cookie?: string }): Promise<ArticleItem> {
  return run(
    articlesGetArticle({
      path: { articleId: id },
      headers: opts?.cookie ? { cookie: opts.cookie } : undefined,
    }),
    "Failed to fetch article",
  );
}

export async function createArticle(data: {
  title: string;
  body: string;
  isPaid: boolean;
  priceYen: number;
  coverImageUrl?: string | null;
  tags?: string[];
}): Promise<ArticleItem> {
  return run(
    articlesCreateArticle({
      body: data as ModelsCreateArticleRequest,
    }),
    "Failed to create article",
  );
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
  return run(
    articlesUpdateArticle({
      path: { articleId: id },
      body: data as ModelsUpdateArticleRequest,
    }),
    "Failed to update article",
  );
}

export async function publishArticle(id: string): Promise<ArticleItem> {
  return run(articlesPublishArticle({ path: { articleId: id } }), "Failed to publish article");
}

export async function deleteArticle(id: string): Promise<void> {
  await run(articlesDeleteArticle({ path: { articleId: id } }), "Failed to delete article");
}

export async function createCheckoutSession(articleId: string): Promise<{ url: string }> {
  return run(
    articlesCreateArticleCheckout({ path: { articleId } }),
    "Failed to create checkout session",
  );
}

export async function uploadArticleImage(file: File): Promise<string> {
  const data = await run(articlesUploadArticleImage({ body: { file } }), "Failed to upload image");
  return data.url;
}
