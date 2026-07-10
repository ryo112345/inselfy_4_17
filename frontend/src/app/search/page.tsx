import { cookies } from "next/headers";
import { Sidebar } from "@/app/components/Sidebar";
import { SearchPageClient } from "@/features/search/SearchPageClient";
import type { SearchTab } from "@/features/search/useSearch";

const VALID_TABS: SearchTab[] = ["all", "users", "articles", "posts", "jobs"];

type Props = {
  searchParams: Promise<{ q?: string; tab?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? "guest";
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  const params = await searchParams;
  const initialQ = params.q ?? "";
  const initialTab: SearchTab = VALID_TABS.includes(params.tab as SearchTab)
    ? (params.tab as SearchTab)
    : "all";

  return (
    <>
      <Sidebar username={username} defaultOpen={sidebarOpen} />
      <div className="min-h-screen md:pl-[50px] bg-white">
        <SearchPageClient initialQ={initialQ} initialTab={initialTab} />
      </div>
    </>
  );
}
