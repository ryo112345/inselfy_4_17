"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usersUpdateUserProfile } from "@/external/client/api/orval/generated/endpoints/users/users";
import { UsersUpdateUserProfileBody } from "@/external/client/api/orval/generated/zod/users/users.zod";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api-result";
import { formatFieldErrors, validateForm } from "@/lib/form-validation";

const fieldLabels = { name: "名前", username: "ユーザー名" };

export default function SetupPage() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState(() => user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const body = {
      username: username.trim().replace(/^@/, ""),
      name: name.trim(),
    };

    const fieldErrors = validateForm(UsersUpdateUserProfileBody, body);
    if (fieldErrors) {
      setError(formatFieldErrors(fieldErrors, fieldLabels).join("\n"));
      return;
    }

    setSubmitting(true);

    let updated: Awaited<ReturnType<typeof usersUpdateUserProfile>>;
    try {
      updated = await usersUpdateUserProfile(user.username, body);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setError("このユーザー名はすでに使われています");
      } else {
        setError((err instanceof ApiError && err.message) || "設定に失敗しました");
      }
      setSubmitting(false);
      return;
    }

    updateUser({ ...user, ...updated, needsSetup: false });
    router.push(`/profile/${updated.username}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">プロフィール設定</h1>
          <p className="mt-2 text-sm text-gray-600">ユーザー名と名前を設定してください</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                // biome-ignore lint/a11y/noAutofocus: 初期設定の単一入力画面。ページの目的そのものへの自動フォーカスで文脈喪失がない
                autoFocus
              />
            </div>
            <span className="text-xs text-gray-500">
              プロフィールURL: /profile/{username || "your_username"}
            </span>
          </label>

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

          {error && <p className="whitespace-pre-line text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "設定中..." : "設定する"}
          </button>
        </form>
      </div>
    </div>
  );
}
