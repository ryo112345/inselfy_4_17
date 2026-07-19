// 「みつける」検索の薄いラッパー層。デバウンス＋AbortSignal の命令的フローから
// 呼ばれるためシグネチャを維持し、内部だけ orval 生成の平関数に置き換えている。
// 非2xx は mutator が ApiError を throw する。
import {
  searchSearchAll,
  searchSearchArticles,
  searchSearchJobs,
  searchSearchPosts,
  searchSearchUsers,
} from "@/external/client/api/orval/generated/endpoints/search/search";
import type {
  ModelsSearchAllResponse,
  ModelsSearchArticleItem,
  ModelsSearchJobItem,
  ModelsSearchPostItem,
  ModelsSearchUserItem,
} from "@/external/client/api/orval/generated/models";

export type SearchAllResult = ModelsSearchAllResponse;
export type SearchUserItem = ModelsSearchUserItem;
export type SearchArticleItem = ModelsSearchArticleItem;
export type SearchPostItem = ModelsSearchPostItem;
export type SearchJobItem = ModelsSearchJobItem;

export type SearchCategory = "users" | "articles" | "posts" | "jobs";

export type CategoryPage<T> = { items: T[]; total: number };

export async function searchAll(
  q: string,
  limitPerType = 3,
  signal?: AbortSignal,
): Promise<SearchAllResult> {
  return searchSearchAll({ q, limitPerType }, { signal });
}

type PagingParams = { q: string; limit?: number; offset?: number };

export async function searchUsers(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchUserItem>> {
  return searchSearchUsers(params, { signal });
}

export async function searchArticles(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchArticleItem>> {
  return searchSearchArticles(params, { signal });
}

export async function searchPosts(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchPostItem>> {
  return searchSearchPosts(params, { signal });
}

export async function searchJobs(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchJobItem>> {
  return searchSearchJobs(params, { signal });
}
