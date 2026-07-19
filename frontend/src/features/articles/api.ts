// 記事（一覧・CRUD・公開・決済・画像アップロード）の薄いラッパー層。
// SSR の cookie 手渡し（fetchArticle の opts.cookie）を含むためシグネチャを維持し、
// 内部だけ orval 生成の平関数に置き換えている。非2xx は mutator が ApiError を throw する。
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
} from "@/external/client/api/orval/generated/endpoints/articles/articles";
import type {
  ModelsArticleListResponse,
  ModelsArticleResponse,
  ModelsCreateArticleRequest,
  ModelsUpdateArticleRequest,
} from "@/external/client/api/orval/generated/models";

export type ArticleItem = ModelsArticleResponse;
export type ArticleListResponse = ModelsArticleListResponse;

export async function fetchArticles(limit = 20, offset = 0): Promise<ArticleListResponse> {
  return articlesListArticles({ limit, offset });
}

export async function fetchMyArticles(limit = 50, offset = 0): Promise<ArticleListResponse> {
  return articlesListMyArticles({ limit, offset });
}

export async function fetchArticle(id: string, opts?: { cookie?: string }): Promise<ArticleItem> {
  return articlesGetArticle(id, opts?.cookie ? { headers: { cookie: opts.cookie } } : undefined);
}

export async function createArticle(data: {
  title: string;
  body: string;
  isPaid: boolean;
  priceYen: number;
  coverImageUrl?: string | null;
  tags?: string[];
}): Promise<ArticleItem> {
  return articlesCreateArticle(data as ModelsCreateArticleRequest);
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
  return articlesUpdateArticle(id, data as ModelsUpdateArticleRequest);
}

export async function publishArticle(id: string): Promise<ArticleItem> {
  return articlesPublishArticle(id);
}

export async function deleteArticle(id: string): Promise<void> {
  await articlesDeleteArticle(id);
}

export async function createCheckoutSession(articleId: string): Promise<{ url: string }> {
  return articlesCreateArticleCheckout(articleId);
}

export async function uploadArticleImage(file: File): Promise<string> {
  const data = await articlesUploadArticleImage({ file });
  return data.url;
}
