"use client";

import { useEffect, useState, useTransition } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { fetchFollowStatus, followUser, unfollowUser } from "./api";

type Props = {
  username: string;
  profileColor: string;
};

export function FollowButton({ username, profileColor }: Props) {
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // 未ログインでは呼ばない（401 が正常系になり、SDK の 401 インターセプタが
    // /login リダイレクトを起こすため）。従来どおりスペーサー表示のままになる。
    if (!isAuthenticated) {
      setFollowing(null);
      return;
    }
    fetchFollowStatus(username)
      .then((s) => setFollowing(s.following))
      .catch(() => setFollowing(null));
  }, [username, isAuthenticated]);

  if (following === null) return <div className="w-[120px]" />;

  const handleToggle = () => {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        if (next) {
          await followUser(username);
        } else {
          await unfollowUser(username);
        }
      } catch {
        setFollowing(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className="w-[120px] rounded-full border-2 py-1.5 text-center text-sm font-semibold transition disabled:opacity-50"
      style={
        following
          ? { borderColor: profileColor, color: profileColor, backgroundColor: "white" }
          : { borderColor: profileColor, backgroundColor: profileColor, color: "white" }
      }
    >
      {following ? "フォロー中" : "フォローする"}
    </button>
  );
}
