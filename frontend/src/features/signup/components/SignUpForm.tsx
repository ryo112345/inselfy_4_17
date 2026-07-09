"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "@/external/client/api/client";
import { usersCreateUser } from "@/external/client/api/generated";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim().replace(/^@/, "");

    if (!trimmedName) {
      setError("名前を入力してください");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError("ユーザー名は3〜20文字の英数字・アンダースコアで入力してください");
      return;
    }

    setSubmitting(true);
    const { data, error: apiError } = await usersCreateUser({
      body: { name: trimmedName, username: trimmedUsername },
    });

    if (apiError) {
      if (apiError.code === "CONFLICT") {
        setError("このユーザー名はすでに使われています");
      } else {
        setError(apiError.message || "登録に失敗しました");
      }
      setSubmitting(false);
      return;
    }
    if (!data) {
      setError("登録に失敗しました");
      setSubmitting(false);
      return;
    }

    router.push(`/profile/${data.username}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">名前</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">ユーザー名</span>
        <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-black">
          <span className="pl-3 text-gray-500 text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
            placeholder="yamada_taro"
            className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
          />
        </div>
        <span className="text-xs text-gray-500">
          プロフィールURL: /profile/{username || "your_username"}
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? "作成中..." : "アカウント作成"}
      </button>
    </form>
  );
}
