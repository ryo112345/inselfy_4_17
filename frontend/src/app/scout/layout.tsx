import { cookies } from "next/headers";
import { Sidebar } from "@/app/components/Sidebar";

export default async function ScoutLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? "guest";
  const displayName = cookieStore.get("displayName")?.value;
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  return (
    <>
      <Sidebar username={username} displayName={displayName} defaultOpen={sidebarOpen} />
      {children}
    </>
  );
}
