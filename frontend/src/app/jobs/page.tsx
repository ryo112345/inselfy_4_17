import type { Metadata } from "next";
import { searchPublicJobPostings } from "@/features/job-posting/api";
import { PAGE_SIZE } from "@/features/job-search/constants";
import type { InitialJobSearchData } from "@/features/job-search/useJobSearch";
import { JobsPageClient } from "./JobsPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "求人を探す | inselfy",
  description: "価値観診断とマッチする求人を探せる逆求人プラットフォーム inselfy の公開求人一覧。",
};

export default async function JobsPage() {
  // デフォルト検索条件の1ページ目だけサーバーで先読みする。
  // 失敗時は initialData なしでクライアント側の既存フェッチにフォールバック。
  let initialData: InitialJobSearchData | undefined;
  try {
    const data = await searchPublicJobPostings({ sort: "newest", limit: PAGE_SIZE, offset: 0 });
    initialData = { jobs: data.items, total: data.total };
  } catch (err) {
    console.error("jobs SSR prefetch failed:", err);
    initialData = undefined;
  }
  return <JobsPageClient initialData={initialData} />;
}
