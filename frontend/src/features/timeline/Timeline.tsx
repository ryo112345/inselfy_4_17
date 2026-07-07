"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PostItem } from "./api";
import { fetchTimeline } from "./api";
import { PostCard } from "./PostCard";

type Props = {
  initialPosts: PostItem[];
  initialTotal: number;
  currentUserId?: string;
};

const PAGE_SIZE = 20;

export function Timeline({ initialPosts, initialTotal, currentUserId }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(initialPosts);
    setTotal(initialTotal);
  }, [initialPosts, initialTotal]);

  const hasMore = posts.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetchTimeline(PAGE_SIZE, posts.length, currentUserId);
      setPosts((prev) => [...prev, ...(res.items ?? [])]);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, posts.length, currentUserId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

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
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading && (
            <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
