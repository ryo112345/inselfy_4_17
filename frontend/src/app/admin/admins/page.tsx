"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/features/admin/api";

interface Admin {
  id: string;
  email: string;
  name: string;
  api_key_prefix: string | null;
  last_used_at: string | null;
  created_at: string;
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<{ email: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/admins");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await adminFetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    });
    if (res.ok) {
      setEmail("");
      setName("");
      await fetchAdmins();
    } else {
      const body = await res.json().catch(() => null);
      setCreateError(body?.message ?? "作成に失敗しました");
    }
    setCreating(false);
  };

  const handleIssueKey = async (admin: Admin) => {
    setIssuingId(admin.id);
    const res = await adminFetch(`/api/admin/admins/${admin.id}/api-key`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setIssuedKey({ email: admin.email, key: data.api_key });
      setCopied(false);
      await fetchAdmins();
    }
    setIssuingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await adminFetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDeleteId(null);
      await fetchAdmins();
    }
    setDeletingId(null);
  };

  const copyKey = async () => {
    if (!issuedKey) return;
    await navigator.clipboard.writeText(issuedKey.key);
    setCopied(true);
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h1 className="text-2xl font-bold">管理者管理</h1>
          {admins && (
            <span className="text-sm text-[var(--muted)] ml-2">{admins.length}件</span>
          )}
        </div>

        {issuedKey && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="text-sm font-medium mb-1">
              {issuedKey.email} のAPIキーを発行しました
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              このキーは二度と表示されません。今すぐコピーして安全な場所に保管してください。
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-md text-xs break-all">
                {issuedKey.key}
              </code>
              <button
                onClick={copyKey}
                className="px-4 py-2 text-xs bg-[var(--foreground)] text-white rounded-md hover:opacity-90 transition-opacity shrink-0"
              >
                {copied ? "コピーしました" : "コピー"}
              </button>
              <button
                onClick={() => setIssuedKey(null)}
                className="px-4 py-2 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-6">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前（任意）"
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-[var(--foreground)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? "追加中..." : "管理者を追加"}
            </button>
          </div>
          {createError && <p className="text-sm text-red-600 mt-2">{createError}</p>}
        </form>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : !admins || admins.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)]">管理者がいません</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">管理者</th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">APIキー</th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">最終使用</th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">登録日</th>
                  <th className="text-right text-xs font-medium text-[var(--muted)] px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium">{admin.name || "-"}</div>
                      <div className="text-xs text-[var(--muted)]">{admin.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      {admin.api_key_prefix ? (
                        <code className="text-xs text-[var(--muted)]">{admin.api_key_prefix}</code>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">未発行</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[var(--muted)]">
                        {admin.last_used_at ? formatDate(admin.last_used_at) : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[var(--muted)]">{formatDate(admin.created_at)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleIssueKey(admin)}
                          disabled={issuingId === admin.id}
                          className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          {issuingId === admin.id
                            ? "発行中..."
                            : admin.api_key_prefix
                              ? "キーを再発行"
                              : "キーを発行"}
                        </button>
                        {confirmDeleteId === admin.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(admin.id)}
                              disabled={deletingId === admin.id}
                              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingId === admin.id ? "削除中..." : "確認"}
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
                            onClick={() => setConfirmDeleteId(admin.id)}
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
        )}
      </div>
    </div>
  );
}
