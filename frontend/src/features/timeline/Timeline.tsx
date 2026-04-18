import type { PostItem } from "./api";
import { PostCard } from "./PostCard";

type Props = {
  posts: PostItem[];
};

export function Timeline({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-base font-semibold">まだ投稿がありません</p>
        <p className="text-sm mt-1">最初の投稿をしてみましょう</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
