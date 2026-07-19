"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/features/admin/api";
import { formatDate } from "@/lib/date";
import { type AdminResume, downloadResumePdf, resumeStatusBadge } from "./shared";

const tabs = [
  { label: "未処理", value: "pending" },
  { label: "確認中", value: "reviewing" },
  { label: "反映済み", value: "approved" },
  { label: "却下", value: "rejected" },
  { label: "すべて", value: "" },
] as const;

export default function AdminResumesPage() {
  const [uploads, setUploads] = useState<AdminResume[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const query = params.size > 0 ? `?${params}` : "";
    const res = await adminFetch(`/api/admin/resumes${query}`);
    if (res.ok) {
      setUploads((await res.json()).uploads);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDownload = async (r: AdminResume) => {
    setDownloadingId(r.id);
    await downloadResumePdf(r.id, r.originalFilename);
    setDownloadingId(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--foreground)]"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h1 className="text-2xl font-bold">職務経歴書 管理</h1>
          {uploads && <span className="text-sm text-[var(--muted)] ml-2">{uploads.length}件</span>}
        </div>

        <div className="flex gap-1 mb-6">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-[var(--foreground)] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : !uploads || uploads.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)]">
            該当する職務経歴書がありません
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                    ユーザー
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                    ファイル名
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                    ステータス
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                    アップロード日
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted)] px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium">{r.userName}</div>
                      <div className="text-xs text-[var(--muted)]">@{r.username}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[var(--muted)]">{r.originalFilename}</span>
                    </td>
                    <td className="px-5 py-4">{resumeStatusBadge(r.status)}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[var(--muted)]">{formatDate(r.createdAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownload(r)}
                          disabled={downloadingId === r.id}
                          className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingId === r.id ? "取得中..." : "PDF"}
                        </button>
                        <Link
                          href={`/admin/resumes/${r.id}/draft`}
                          className="px-3 py-1.5 text-xs bg-[var(--foreground)] text-white rounded-md hover:opacity-80 transition-opacity"
                        >
                          詳細
                        </Link>
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
