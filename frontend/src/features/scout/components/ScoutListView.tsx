"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  bulkDeclineScouts,
  bulkRespondScouts,
  fetchReceivedScouts,
  fetchScoutSettings,
  updateScoutSettings,
} from "@/features/scout/api";
import type { ScoutMessage, ScoutSettings, ScoutStatus } from "@/features/scout/types";
import { daysRemaining, formatDateCompact } from "@/lib/date";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<ScoutStatus, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-600" },
  sent: { label: "未読", className: "bg-blue-100 text-blue-800" },
  opened: { label: "既読", className: "bg-yellow-100 text-yellow-800" },
  replied: { label: "返信済み", className: "bg-green-100 text-green-800" },
  interested: { label: "興味あり", className: "bg-emerald-100 text-emerald-800" },
  declined: { label: "辞退", className: "bg-red-100 text-red-800" },
  expired: { label: "期限切れ", className: "bg-gray-100 text-gray-800" },
};

export function ScoutListView() {
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
  const [responding, setResponding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadScouts = useCallback(async (offset: number) => {
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
  }, []);

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

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function handleBulkDecline() {
    if (selected.size === 0 || declining) return;
    const count = selected.size;
    setDeclining(true);
    try {
      await bulkDeclineScouts(Array.from(selected));
      setSelected(new Set());
      await loadScouts(page * PAGE_SIZE);
      showToast(`${count}件のスカウトを辞退しました`);
    } catch {
      showToast("一括辞退に失敗しました", "error");
    } finally {
      setDeclining(false);
    }
  }

  async function handleBulkInterested() {
    if (selected.size === 0 || responding) return;
    const count = selected.size;
    setResponding(true);
    try {
      await bulkRespondScouts(Array.from(selected), "interested");
      setSelected(new Set());
      await loadScouts(page * PAGE_SIZE);
      showToast(`${count}件のスカウトに興味ありと回答しました`);
    } catch {
      showToast("一括応答に失敗しました", "error");
    } finally {
      setResponding(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header: select all + settings toggle */}
      <div className="flex items-center justify-between mb-5">
        {scouts.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === scouts.length && scouts.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            すべて選択
          </label>
        ) : (
          <div />
        )}

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
            <span className="text-xs text-gray-400">{settings.acceptingScouts ? "ON" : "OFF"}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && scouts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-gray-400 text-sm">スカウトはまだありません</p>
        </div>
      )}

      {!loading && !error && scouts.length > 0 && (
        <div className="space-y-3">
          {scouts.map((scout) => {
            const badge = STATUS_BADGE[scout.status];
            const remaining = daysRemaining(scout.expiresAt);
            const isUnread = scout.status === "sent";

            return (
              // biome-ignore lint/a11y/useSemanticElements: 内部に選択チェックボックスを含む行全体の遷移領域のため a 要素にできない
              <div
                key={scout.id}
                role="link"
                tabIndex={0}
                className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow ${
                  isUnread ? "border-l-4 border-l-blue-500" : ""
                }`}
                onClick={() => router.push(`/scout/${scout.id}`)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.target !== e.currentTarget) return;
                  router.push(`/scout/${scout.id}`);
                }}
              >
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {scout.companyName}
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 font-medium truncate mb-1">{scout.subject}</p>

                  {scout.jobTitle && (
                    <p className="text-xs text-gray-500 truncate mb-1">{scout.jobTitle}</p>
                  )}

                  {scout.body && (
                    <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
                      {scout.body}
                    </p>
                  )}

                  <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                    <span>受信: {formatDateCompact(scout.sentAt)}</span>
                    {scout.expiresAt && (
                      <span
                        className={
                          remaining === "期限切れ" || remaining === "今日まで"
                            ? "text-red-500 font-medium"
                            : ""
                        }
                      >
                        期限: {formatDateCompact(scout.expiresAt)}
                        {remaining && ` (${remaining})`}
                      </span>
                    )}
                  </div>
                </div>

                <svg
                  aria-hidden="true"
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

      {selected.size > 0 && <div className="h-20" />}

      {/* Floating bulk action bar */}
      <div
        role="toolbar"
        aria-label="一括操作"
        className={`fixed bottom-24 md:bottom-6 left-1/2 z-40 transition-all duration-300 ease-out ${
          selected.size > 0
            ? "opacity-100 -translate-x-1/2 translate-y-0"
            : "opacity-0 -translate-x-1/2 translate-y-3 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap px-3">
            {selected.size}件選択中
          </span>

          <span className="w-px h-5 bg-gray-200" />

          <button
            type="button"
            onClick={handleBulkInterested}
            disabled={responding}
            className="flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-brand hover:bg-brand/8 rounded-lg px-3 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <svg
              aria-hidden="true"
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {responding ? "処理中..." : "興味あり"}
          </button>

          <span className="w-px h-5 bg-gray-200" />

          <button
            type="button"
            onClick={handleBulkDecline}
            disabled={declining}
            className="flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg px-3 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <svg
              aria-hidden="true"
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            {declining ? "処理中..." : "辞退する"}
          </button>

          <span className="w-px h-5 bg-gray-200" />

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="min-h-[44px] text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg px-3 transition-colors cursor-pointer whitespace-nowrap"
          >
            キャンセル
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-[toastSlideDown_0.35s_cubic-bezier(0.21,1.02,0.73,1)]">
          <div
            className={`flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border ${
              toast.type === "error"
                ? "bg-red-50 border-red-200"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-brand"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className={`text-sm font-medium ${
                toast.type === "error" ? "text-red-800" : "text-emerald-800"
              }`}
            >
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
