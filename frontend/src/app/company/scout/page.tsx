"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCompanyScouts,
  fetchCredits,
  fetchQualityScore,
} from "@/features/scout/api";
import type {
  ScoutMessage,
  ScoutCredits,
  QualityScore,
  ScoutStatus,
} from "@/features/scout/types";

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: ScoutStatus | "all" }[] = [
  { label: "全て", value: "all" },
  { label: "送信済み", value: "sent" },
  { label: "開封済み", value: "opened" },
  { label: "返信あり", value: "replied" },
  { label: "興味あり", value: "interested" },
  { label: "辞退", value: "declined" },
  { label: "期限切れ", value: "expired" },
];

const STATUS_BADGE: Record<ScoutStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "下書き" },
  sent: { bg: "bg-blue-50", text: "text-blue-700", label: "送信済み" },
  opened: { bg: "bg-yellow-50", text: "text-yellow-700", label: "開封済み" },
  replied: { bg: "bg-green-50", text: "text-green-700", label: "返信あり" },
  interested: { bg: "bg-emerald-50", text: "text-emerald-700", label: "興味あり" },
  declined: { bg: "bg-red-50", text: "text-red-700", label: "辞退" },
  expired: { bg: "bg-gray-100", text: "text-gray-500", label: "期限切れ" },
};

const QUALITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "bg-emerald-50", text: "text-emerald-700", label: "良好" },
  warning: { bg: "bg-yellow-50", text: "text-yellow-700", label: "注意" },
  restricted: { bg: "bg-red-50", text: "text-red-700", label: "制限中" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function ScoutListPage() {
  const [scouts, setScouts] = useState<ScoutMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [credits, setCredits] = useState<ScoutCredits | null>(null);
  const [quality, setQuality] = useState<QualityScore | null>(null);
  const [activeTab, setActiveTab] = useState<ScoutStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credits and quality on mount
  useEffect(() => {
    fetchCredits().then(setCredits).catch(() => {});
    fetchQualityScore().then(setQuality).catch(() => {});
  }, []);

  // Fetch scouts when tab or page changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCompanyScouts({
      status: activeTab === "all" ? undefined : activeTab,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        setScouts(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const creditPercent = credits ? Math.round((credits.balance / credits.maxStock) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">スカウト管理</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/company/scout/templates"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            テンプレート管理
          </Link>
          <Link
            href="/company/scout/send"
            className="bg-[#2979ff] text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            スカウトを送る
          </Link>
        </div>
      </div>

      {/* Credits + Quality */}
      <div className="grid grid-cols-2 gap-4">
        {/* Credit card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">クレジット残高</p>
            {credits && (
              <span className="text-xs text-gray-400">
                月間付与: {credits.monthlyAllowance}
              </span>
            )}
          </div>
          {credits ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-gray-900">{credits.balance}</span>
                <span className="text-sm text-gray-400">/ {credits.maxStock}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${creditPercent}%`,
                    backgroundColor: creditPercent > 20 ? "#2979ff" : "#ef4444",
                  }}
                />
              </div>
            </>
          ) : (
            <div className="h-12 flex items-center">
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          )}
        </div>

        {/* Quality score card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-3">品質スコア（直近14日）</p>
          {quality ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-bold text-gray-900">
                  {(quality.replyRate14d * 100).toFixed(1)}%
                </span>
                {(() => {
                  const badge = QUALITY_BADGE[quality.level];
                  return badge ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  ) : null;
                })()}
              </div>
              <p className="text-xs text-gray-400">
                送信: {quality.sentLast14d}件 / 返信: {quality.repliedLast14d}件
              </p>
            </>
          ) : (
            <div className="h-12 flex items-center">
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setPage(0);
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.value
                ? "border-[#2979ff] text-[#2979ff]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      ) : scouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">スカウトはまだありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="py-3 pl-5 pr-2 font-medium">候補者</th>
                <th className="px-2 py-3 font-medium">件名</th>
                <th className="px-2 py-3 font-medium">求人</th>
                <th className="px-2 py-3 font-medium">ステータス</th>
                <th className="px-2 py-3 font-medium">送信日</th>
                <th className="py-3 pl-2 pr-5 font-medium">期限</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scouts.map((scout) => {
                const badge = STATUS_BADGE[scout.status];
                return (
                  <tr key={scout.id} className="transition-colors hover:bg-gray-50">
                    <td className="py-3.5 pl-5 pr-2">
                      <Link
                        href={`/company/scout/${scout.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                        style={{ textDecorationColor: "#2979ff" }}
                      >
                        {scout.candidateName}
                      </Link>
                    </td>
                    <td className="px-2 py-3.5 text-gray-700 max-w-[200px] truncate">
                      {scout.subject}
                    </td>
                    <td className="px-2 py-3.5 text-gray-500 text-xs">
                      {scout.jobTitle ?? "-"}
                    </td>
                    <td className="px-2 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-gray-500 text-xs">
                      {formatDate(scout.sentAt)}
                    </td>
                    <td className="py-3.5 pl-2 pr-5 text-gray-500 text-xs">
                      {formatDate(scout.expiresAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            前へ
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
