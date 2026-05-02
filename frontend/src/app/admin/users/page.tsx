"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loggingInId, setLoggingInId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleBypassLogin = async (userId: string, username: string) => {
    setLoggingInId(userId);
    const res = await fetch(`/api/admin/users/${userId}/bypass-login`, {
      method: "POST",
    });
    if (res.ok) {
      window.open(`/profile/${username}`, "_blank");
    }
    setLoggingInId(null);
  };

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDeleteId(null);
      await fetchUsers();
    }
    setDeletingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground)]">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          {data && (
            <span className="text-sm text-[var(--muted)] ml-2">
              {data.total}件
            </span>
          )}
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="名前、ユーザー名、メールアドレスで検索..."
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[var(--foreground)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              検索
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="px-4 py-2.5 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)]">
            {search ? "検索結果がありません" : "ユーザーがいません"}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">ユーザー</th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">メールアドレス</th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">登録日</th>
                    <th className="text-right text-xs font-medium text-[var(--muted)] px-5 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-medium">
                              {user.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {user.name}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">
                          {user.email || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleBypassLogin(user.id, user.username)}
                            disabled={loggingInId === user.id}
                            className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            {loggingInId === user.id ? "ログイン中..." : "ログイン"}
                          </button>
                          <Link
                            href={`/profile/${user.username}`}
                            target="_blank"
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            表示
                          </Link>
                          {confirmDeleteId === user.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deletingId === user.id}
                                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {deletingId === user.id ? "削除中..." : "確認"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                戻る
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(user.id)}
                              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="text-sm text-[var(--muted)] px-3">
                  {data.page} / {data.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page >= data.total_pages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
