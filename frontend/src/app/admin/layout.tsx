"use client";

import { useEffect, useState } from "react";

import { clearAdminKey, getAdminKey, setAdminKey } from "@/features/admin/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setAuthed(getAdminKey() !== null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = input.trim();
    if (!key) return;
    setVerifying(true);
    setError("");
    const res = await fetch("/api/admin/admins", {
      headers: { "X-Admin-Key": key },
    });
    if (res.ok) {
      setAdminKey(key);
      setAuthed(true);
    } else {
      setError(res.status === 401 ? "キーが無効です" : "確認に失敗しました");
    }
    setVerifying(false);
  };

  if (authed === null) {
    return null;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8"
        >
          <h1 className="text-lg font-bold mb-1">管理者認証</h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            管理者APIキー（X-Admin-Key）を入力してください
          </p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="admin_..."
            // biome-ignore lint/a11y/noAutofocus: 単一入力の認証専用画面。ページの目的そのものへの自動フォーカスで文脈喪失がない
            autoFocus
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors mb-3"
          />
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={verifying || !input.trim()}
            className="w-full px-5 py-2.5 bg-[var(--foreground)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {verifying ? "確認中..." : "認証"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          clearAdminKey();
          setAuthed(false);
        }}
        className="absolute top-4 right-6 z-10 px-3 py-1.5 text-xs text-[var(--muted)] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        キーを変更
      </button>
      {children}
    </div>
  );
}
