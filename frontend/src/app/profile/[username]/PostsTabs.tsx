"use client";

import { useEffect, useState } from "react";
import type { PostItem } from "@/features/timeline/api";
import { fetchLikedPosts } from "@/features/timeline/api";
import { PostCard } from "@/features/timeline/PostCard";

const TABS = [
  { key: "posts", label: "ポスト", empty: "まだポストがありません" },
  { key: "articles", label: "記事", empty: "まだ記事がありません" },
  { key: "replies", label: "返信", empty: "まだ返信がありません" },
  { key: "likes", label: "いいね", empty: "まだいいねがありません" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Props = {
  posts?: PostItem[];
  userId?: string;
  currentUserId?: string;
};

export function PostsTabs({ posts = [], userId, currentUserId }: Props) {
  const [active, setActive] = useState<TabKey>("posts");
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  const [likedPosts, setLikedPosts] = useState<PostItem[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedLoaded, setLikedLoaded] = useState(false);
  const [likedError, setLikedError] = useState(false);
  const [likedReloadKey, setLikedReloadKey] = useState(0);

  // 別プロフィールに遷移したとき、前ユーザーのいいね一覧が残らないようリセットする
  // biome-ignore lint/correctness/useExhaustiveDependencies: userId 変更時に前ユーザーの一覧をリセットするトリガー
  useEffect(() => {
    setLikedPosts([]);
    setLikedLoaded(false);
    setLikedError(false);
  }, [userId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: likedReloadKey は再読み込みトリガー
  useEffect(() => {
    if (active !== "likes" || !userId || likedLoaded) return;
    setLikedLoading(true);
    setLikedError(false);
    fetchLikedPosts(userId)
      .then((res) => {
        setLikedPosts(res.items ?? []);
        setLikedLoaded(true);
      })
      .catch(() => setLikedError(true))
      .finally(() => setLikedLoading(false));
  }, [active, userId, likedLoaded, likedReloadKey]);

  function renderContent() {
    if (active === "posts") {
      if (posts.length === 0) return null;
      return (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </div>
      );
    }
    if (active === "likes") {
      if (likedLoading) {
        return (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
          </div>
        );
      }
      if (likedError) {
        return (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <p className="text-sm text-red-600">いいねの読み込みに失敗しました</p>
            <button
              type="button"
              onClick={() => setLikedReloadKey((k) => k + 1)}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              再読み込み
            </button>
          </div>
        );
      }
      if (likedPosts.length > 0) {
        return (
          <div>
            {likedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={currentUserId} />
            ))}
          </div>
        );
      }
    }
    return null;
  }

  const content = renderContent();

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="grid grid-cols-4 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className="relative py-3 md:py-4 text-sm md:text-base font-semibold text-gray-900 transition"
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-4 md:inset-x-12 bottom-0 h-[3px] rounded-full bg-emerald-700" />
              )}
            </button>
          );
        })}
      </div>

      {content ?? (
        <div className="py-14 text-center text-base text-gray-500">{activeTab.empty}</div>
      )}
    </section>
  );
}
