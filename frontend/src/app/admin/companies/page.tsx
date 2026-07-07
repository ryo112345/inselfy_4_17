"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/features/admin/api";
import { formatDate } from "@/lib/date";

interface AdminCompany {
  id: string;
  email: string;
  companyName: string;
  contactPersonName: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

interface CompanyListResponse {
  companies: AdminCompany[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const tabs = [
  { label: "審査待ち", value: "pending" },
  { label: "承認済み", value: "approved" },
  { label: "却下", value: "rejected" },
  { label: "すべて", value: "" },
] as const;

export default function AdminCompaniesPage() {
  const [data, setData] = useState<CompanyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loggingInId, setLoggingInId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await adminFetch(`/api/admin/companies?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleBypassLogin = async (companyId: string) => {
    setLoggingInId(companyId);
    const res = await adminFetch(`/api/admin/companies/${companyId}/bypass-login`, {
      method: "POST",
    });
    if (res.ok) {
      window.open("/company", "_blank");
    }
    setLoggingInId(null);
  };

  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    setActionId(id);
    const res = await adminFetch(`/api/admin/companies/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchCompanies();
    }
    setActionId(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">
            審査待ち
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
            承認済み
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 border border-red-200">
            却下
          </span>
        );
      default:
        return null;
    }
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
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" />
            <path d="M10 22v-4h4v4" />
          </svg>
          <h1 className="text-2xl font-bold">企業管理</h1>
          {data && <span className="text-sm text-[var(--muted)] ml-2">{data.total}件</span>}
        </div>

        <div className="flex gap-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
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
        ) : !data || data.companies.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)]">該当する企業がありません</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      企業名
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      担当者
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      メール
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      電話番号
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      ステータス
                    </th>
                    <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">
                      登録日
                    </th>
                    <th className="text-right text-xs font-medium text-[var(--muted)] px-5 py-3">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium">{c.companyName}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">{c.contactPersonName}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">{c.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">{c.phoneNumber}</span>
                      </td>
                      <td className="px-5 py-4">{statusBadge(c.status)}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[var(--muted)]">
                          {formatDate(c.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleBypassLogin(c.id)}
                            disabled={loggingInId === c.id}
                            className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {loggingInId === c.id ? "ログイン中..." : "ログイン"}
                          </button>
                          {c.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(c.id, "approved")}
                                disabled={actionId === c.id}
                                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => handleStatusChange(c.id, "rejected")}
                                disabled={actionId === c.id}
                                className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                却下
                              </button>
                            </>
                          )}
                          {c.status === "rejected" && (
                            <button
                              onClick={() => handleStatusChange(c.id, "approved")}
                              disabled={actionId === c.id}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              承認に変更
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
