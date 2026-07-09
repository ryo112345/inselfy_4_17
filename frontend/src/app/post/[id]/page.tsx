import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { fetchComments, fetchPost } from "@/features/timeline/api";
import { PostDetail } from "./PostDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("inselfy_token")?.value;
  const userId = hasToken ? (cookieStore.get("userId")?.value ?? "") : "";
  const username = hasToken ? (cookieStore.get("username")?.value ?? "guest") : "guest";
  const sidebarOpen = cookieStore.get("sidebar-open")?.value === "true";

  let post: Awaited<ReturnType<typeof fetchPost>>;
  let comments: Awaited<ReturnType<typeof fetchComments>>;
  try {
    [post, comments] = await Promise.all([fetchPost(id, userId), fetchComments(id, 50, 0)]);
  } catch {
    notFound();
  }

  return (
    <>
      <Sidebar username={username} defaultOpen={sidebarOpen} />
      <div className="flex justify-center min-h-screen md:pl-[50px]">
        <main className="w-full max-w-[600px] border-x border-gray-200/80 min-h-screen bg-white">
          <PostDetail post={post} comments={comments.items} currentUserId={userId} />
        </main>
      </div>
    </>
  );
}
