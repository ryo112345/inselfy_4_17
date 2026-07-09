"use client";

import { useState, useTransition } from "react";

import { followUser, unfollowUser } from "./api";

type Props = {
  username: string;
  profileColor: string;
  // サーバー（page.tsx）で取得した初期フォロー状態。null は未ログイン等（ボタン非表示）
  initialFollowing: boolean | null;
};

export function FollowButton({ username, profileColor, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

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
