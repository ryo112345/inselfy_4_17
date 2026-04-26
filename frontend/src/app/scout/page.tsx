"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchReceivedScouts,
  fetchScoutSettings,
  updateScoutSettings,
  bulkDeclineScouts,
} from "@/features/scout/api";
import type { ScoutMessage, ScoutSettings, ScoutStatus } from "@/features/scout/types";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<
  ScoutStatus,
  { label: string; className: string }
> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-600" },
  sent: { label: "未読", className: "bg-blue-100 text-blue-800" },
  opened: { label: "既読", className: "bg-yellow-100 text-yellow-800" },
  replied: { label: "返信済み", className: "bg-green-100 text-green-800" },
  interested: { label: "興味あり", className: "bg-emerald-100 text-emerald-800" },
  declined: { label: "辞退", className: "bg-red-100 text-red-800" },
  expired: { label: "期限切れ", className: "bg-gray-100 text-gray-800" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function daysRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return "期限切れ";
  if (diff === 0) return "今日まで";
  return `残り${diff}日`;
}

export default function ScoutListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [scouts, setScouts] = useState<ScoutMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ScoutSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [declining, setDeclining] = useState(false);

  const loadScouts = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReceivedScouts({
          limit: PAGE_SIZE,
          offset,
        });
        setScouts(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadScouts(page * PAGE_SIZE);
  }, [authLoading, user, page, loadScouts]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchScoutSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, [authLoading, user]);

  async function handleToggleSettings() {
    if (!settings || toggling) return;
    setToggling(true);
    try {
      const updated = await updateScoutSettings(!settings.acceptingScouts);
      setSettings(updated);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  function handleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selected.size === scouts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scouts.map((s) => s.id)));
    }
  }

  async function handleBulkDecline() {
    if (selected.size === 0 || declining) return;
    if (!confirm(`${selected.size}件のスカウトを辞退しますか?`)) return;
    setDeclining(true);
    try {
      await bulkDeclineScouts(Array.from(selected));
      setSelected(new Set());
      await loadScouts(page * PAGE_SIZE);
    } catch {
      alert("一括辞退に失敗しました");
    } finally {
      setDeclining(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="min-h-screen pl-[50px] bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pl-[50px] bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pl-[50px] bg-gray-50">
      <div className="max-w-[900px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">スカウト</h1>

          {/* Settings toggle */}
          {!settingsLoading && settings && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">スカウト受付</span>
              <button
                type="button"
                onClick={handleToggleSettings}
                disabled={toggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.acceptingScouts ? "bg-emerald-500" : "bg-gray-300"
                } ${toggling ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.acceptingScouts ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-gray-400">
                {settings.acceptingScouts ? "ON" : "OFF"}
              </span>
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {scouts.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === scouts.length && scouts.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              すべて選択
            </label>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDecline}
                disabled={declining}
                className="border border-red-300 text-red-600 px-4 py-1.5 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {declining
                  ? "処理中..."
                  : `選択したスカウトを辞退 (${selected.size}件)`}
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-400 text-sm">読み込み中...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && scouts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-400 text-sm">スカウトはまだありません</p>
          </div>
        )}

        {/* Scout cards */}
        {!loading && !error && scouts.length > 0 && (
          <div className="space-y-3">
            {scouts.map((scout) => {
              const badge = STATUS_BADGE[scout.status];
              const remaining = daysRemaining(scout.expiresAt);
              const isUnread = scout.status === "sent";

              return (
                <div
                  key={scout.id}
                  className={`bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow ${
                    isUnread ? "border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => router.push(`/scout/${scout.id}`)}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(scout.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelect(scout.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 rounded border-gray-300 shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {scout.companyName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 font-medium truncate mb-1">
                      {scout.subject}
                    </p>

                    {scout.jobTitle && (
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {scout.jobTitle}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>受信: {formatDate(scout.sentAt)}</span>
                      {scout.expiresAt && (
                        <span
                          className={
                            remaining === "期限切れ" || remaining === "今日まで"
                              ? "text-red-500 font-medium"
                              : ""
                          }
                        >
                          期限: {formatDate(scout.expiresAt)}
                          {remaining && ` (${remaining})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="h-5 w-5 text-gray-300 shrink-0 mt-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              前へ
            </button>
            <span className="text-sm text-gray-600">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
