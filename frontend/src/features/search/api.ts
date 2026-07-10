import "@/external/client/api/client";
import {
  type ModelsSearchAllResponse,
  type ModelsSearchArticleItem,
  type ModelsSearchJobItem,
  type ModelsSearchPostItem,
  type ModelsSearchUserItem,
  searchSearchAll,
  searchSearchArticles,
  searchSearchJobs,
  searchSearchPosts,
  searchSearchUsers,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";

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
  return run(
    searchSearchAll({ query: { q, limitPerType }, signal, cache: "no-store" }),
    "Failed to search",
  );
}

type PagingParams = { q: string; limit?: number; offset?: number };

export async function searchUsers(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchUserItem>> {
  return run(
    searchSearchUsers({ query: params, signal, cache: "no-store" }),
    "Failed to search users",
  );
}

export async function searchArticles(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchArticleItem>> {
  return run(
    searchSearchArticles({ query: params, signal, cache: "no-store" }),
    "Failed to search articles",
  );
}

export async function searchPosts(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchPostItem>> {
  return run(
    searchSearchPosts({ query: params, signal, cache: "no-store" }),
    "Failed to search posts",
  );
}

export async function searchJobs(
  params: PagingParams,
  signal?: AbortSignal,
): Promise<CategoryPage<SearchJobItem>> {
  return run(
    searchSearchJobs({ query: params, signal, cache: "no-store" }),
    "Failed to search jobs",
  );
}
