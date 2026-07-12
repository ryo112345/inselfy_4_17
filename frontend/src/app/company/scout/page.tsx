"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCompanyScouts, fetchQualityScore, fetchScoutDashboard } from "@/features/scout/api";
import type {
  QualityScore,
  ScoutDashboard,
  ScoutMessage,
  ScoutStatus,
} from "@/features/scout/types";
import { formatDate } from "@/lib/date";

const PAGE_SIZE = 20;
const accent = "#2979ff";
const num = { fontFamily: "var(--font-plus-jakarta-sans)" };

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
  temporarily_restricted: { bg: "bg-orange-50", text: "text-orange-700", label: "一時制限中" },
  restricted: { bg: "bg-red-50", text: "text-red-700", label: "制限中" },
};

function formatMonth(iso: string) {
  const m = parseInt(iso.split("-")[1], 10);
  return `${m}月`;
}

function formatReplenishDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ScoutListPage() {
  const router = useRouter();
  const [scouts, setScouts] = useState<ScoutMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<ScoutDashboard | null>(null);
  const [quality, setQuality] = useState<QualityScore | null>(null);
  const [activeTab, setActiveTab] = useState<ScoutStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScoutDashboard()
      .then(setDashboard)
      .catch(() => {});
    fetchQualityScore()
      .then(setQuality)
      .catch(() => {});
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
  const totalCredits = dashboard ? dashboard.credits.balance + dashboard.pending.total : 0;
  const creditPct =
    dashboard && totalCredits > 0
      ? Math.round((dashboard.credits.balance / totalCredits) * 100)
      : 0;
  const creditLow = dashboard
    ? dashboard.credits.balance / dashboard.credits.maxStock < 0.2
    : false;

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

      {/* Credits + Quality cards */}
      {dashboard ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Left card: credits + performance */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-base font-semibold text-gray-700">送信可能</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className="text-3xl font-bold"
                style={{ color: creditLow ? "#ef4444" : accent, ...num }}
              >
                {dashboard.credits.balance}
              </span>
              <span className="text-sm font-normal text-gray-400">
                / <span style={num}>{totalCredits}</span> 通
              </span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${creditPct}%`, backgroundColor: creditLow ? "#ef4444" : accent }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              補充: {formatReplenishDate(dashboard.credits.nextReplenishDate)}（+
              {Math.min(
                dashboard.credits.monthlyAllowance,
                dashboard.credits.maxStock - dashboard.credits.balance,
              )}
              通 / 上限{dashboard.credits.maxStock}通）
            </p>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2.5 text-base font-semibold text-gray-700">
                スカウト成果（直近90日）
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">スカウト経由応募</span>
                  <span className="font-medium text-gray-700">
                    <span className="text-lg font-bold" style={num}>
                      —
                    </span>{" "}
                    件
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">応募あたり送信数</span>
                  <span className="font-medium text-gray-700">
                    <span className="text-lg font-bold" style={num}>
                      —
                    </span>{" "}
                    通/件
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">返信率</span>
                  <span className="font-medium text-gray-700">
                    <span className="text-lg font-bold" style={num}>
                      {dashboard.replyRate}
                    </span>{" "}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right card: pending + quality */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex gap-6">
              {/* Left: 返信待ち */}
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-700">返信待ち</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900" style={num}>
                    {dashboard.pending.total}
                  </span>
                  <span className="text-sm font-normal text-gray-400">通</span>
                </div>
              </div>
              {/* Right: 品質スコア */}
              <div className="flex-1 text-right">
                <p className="text-xs font-medium text-gray-400">品質スコア（14日）</p>
                {quality ? (
                  <>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <span className="text-2xl font-bold text-gray-900" style={num}>
                        {(quality.replyRate14d * 100).toFixed(1)}%
                      </span>
                      {(() => {
                        const badge = QUALITY_BADGE[quality.level];
                        return badge ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      送信: {quality.sentLast14d}件 / 返信: {quality.repliedLast14d}件
                    </p>
                    {quality.level === "warning" && quality.daysRemaining != null && (
                      <p className="text-xs text-yellow-600 mt-0.5">
                        改善期限まで残り{quality.daysRemaining}日
                      </p>
                    )}
                    {quality.level === "temporarily_restricted" &&
                      quality.daysRemaining != null && (
                        <p className="text-xs text-orange-600 mt-0.5">
                          制限解除まで残り{quality.daysRemaining}日
                        </p>
                      )}
                  </>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
            </div>
            <div className="mt-2.5 space-y-2">
              {dashboard.pending.byMonth.map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{formatMonth(m.month)}送信分</span>
                  <span className="flex items-baseline">
                    <span
                      className="inline-flex items-baseline justify-end font-medium text-gray-700"
                      style={{ width: "3.5rem" }}
                    >
                      <span className="text-lg font-bold" style={num}>
                        {m.count}
                      </span>
                      <span className="ml-1">通</span>
                    </span>
                    <span
                      className={`inline-flex items-baseline justify-end ${m.daysLeft <= 14 ? "font-semibold text-red-500" : "text-gray-400"}`}
                      style={{ width: "4.5rem" }}
                    >
                      残
                      <span className="ml-1.5 text-lg font-bold" style={num}>
                        {m.daysLeft}
                      </span>{" "}
                      日
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">平均返信日数</span>
              <span className="font-medium text-gray-700">
                <span className="text-lg font-bold" style={num}>
                  {dashboard.avgReplyDays}
                </span>{" "}
                日
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
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
                  <tr
                    key={scout.id}
                    className="transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/company/scout/${scout.id}`)}
                  >
                    <td className="py-3.5 pl-5 pr-2">
                      <Link
                        href={`/company/scout/${scout.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                        style={{ textDecorationColor: "#2979ff" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {scout.candidateName}
                      </Link>
                    </td>
                    <td className="px-2 py-3.5 text-gray-700 max-w-[200px] truncate">
                      {scout.subject}
                    </td>
                    <td className="px-2 py-3.5 text-gray-500 text-xs">{scout.jobTitle ?? "-"}</td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                      >
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
            type="button"
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
            type="button"
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
