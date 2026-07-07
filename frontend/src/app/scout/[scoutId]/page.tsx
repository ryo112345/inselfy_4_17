"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { fetchReceivedScoutDetail, respondToScout } from "@/features/scout/api";
import type { ScoutDetail, ScoutReply, ScoutStatus } from "@/features/scout/types";
import { useUnreadScout } from "@/features/scout/unread-context";

const STATUS_BADGE: Record<ScoutStatus, { label: string; className: string }> = {
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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ja-JP")} ${d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function daysRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "期限切れ";
  if (diff === 0) return "今日まで";
  return `残り${diff}日`;
}

export default function ScoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scoutId = params.scoutId as string;
  const { user, isLoading: authLoading } = useAuth();
  const { refresh: refreshUnread } = useUnreadScout();

  const [detail, setDetail] = useState<ScoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [responding, setResponding] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReceivedScoutDetail(scoutId);
      setDetail(data);
      refreshUnread();
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [scoutId, refreshUnread]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadDetail();
  }, [authLoading, user, loadDetail]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRespond(response: "interested" | "declined") {
    if (responding) return;
    setResponding(true);
    try {
      await respondToScout(scoutId, response);
      showToast(response === "interested" ? "興味ありと回答しました" : "辞退しました");
      await loadDetail();
    } catch {
      showToast("応答に失敗しました", "error");
    } finally {
      setResponding(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen md:pl-[50px] bg-[#f6f7f5] flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen md:pl-[50px] bg-[#f6f7f5] flex items-center justify-center">
        <p className="text-gray-500 text-sm">ログインしてください</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen md:pl-[50px] bg-[#f6f7f5] flex items-center justify-center">
        <p className="text-red-500 text-sm">{error ?? "データが見つかりません"}</p>
      </div>
    );
  }

  const { message, replies } = detail;
  const badge = STATUS_BADGE[message.status];
  const remaining = daysRemaining(message.expiresAt);
  const canRespond = message.status === "sent" || message.status === "opened";

  return (
    <div className="min-h-screen md:pl-[50px] bg-[#f6f7f5]">
      <div className="max-w-[800px] mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/scout")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 md:mb-6 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
          スカウト一覧に戻る
        </button>

        {/* Message card */}
        <div className="bg-white rounded-xl border border-gray-200 mb-5">
          {/* From header */}
          <div className="px-4 py-3.5 md:px-6 md:py-4 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[#3D8B6E]/8 flex items-center justify-center shrink-0">
                  <span className="text-xs md:text-sm font-bold text-[#3D8B6E]">
                    {message.companyName.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/companies/${message.companyId}`}
                    className="text-sm font-semibold text-gray-900 hover:text-[#3D8B6E] truncate block transition-colors"
                  >
                    {message.companyName}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(message.sentAt)}</span>
                    {message.expiresAt && (
                      <>
                        <span>·</span>
                        <span
                          className={
                            remaining === "期限切れ" || remaining === "今日まで"
                              ? "text-red-500 font-medium"
                              : ""
                          }
                        >
                          {remaining ?? `期限 ${formatDate(message.expiresAt)}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] md:text-xs font-medium shrink-0 ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
          </div>

          {/* Subject + body */}
          <div className="px-4 py-5 md:px-6 md:py-6">
            <h1 className="text-base md:text-lg font-bold text-gray-900 mb-1">{message.subject}</h1>
            {message.jobTitle && (
              <p className="text-sm text-gray-500 mb-4 md:mb-5">
                ポジション：
                {message.jobPostingId ? (
                  <Link
                    href={`/jobs/${message.jobPostingId}`}
                    className="hover:text-[#3D8B6E] transition-colors"
                  >
                    {message.jobTitle}
                  </Link>
                ) : (
                  message.jobTitle
                )}
              </p>
            )}
            {!message.jobTitle && <div className="mb-4 md:mb-5" />}
            <p className="text-sm text-gray-700 leading-[1.9] whitespace-pre-wrap">
              {message.body}
            </p>
          </div>

          {/* Footer: links + actions */}
          <div className="px-4 py-3.5 md:px-6 md:py-4 border-t border-gray-100">
            {/* Desktop: single row */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Link
                  href={`/companies/${message.companyId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm3.5-3.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  企業ページ
                </Link>
                {message.jobPostingId && (
                  <Link
                    href={`/jobs/${message.jobPostingId}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.6-4.03.93-6.17.93s-4.219-.33-6.17-.93C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z"
                        clipRule="evenodd"
                      />
                      <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686A41.454 41.454 0 0110 18c-1.572 0-3.118-.12-4.637-.329C3.985 17.585 3 16.402 3 15.055z" />
                    </svg>
                    求人詳細
                  </Link>
                )}
              </div>
              {canRespond && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond("interested")}
                    disabled={responding}
                    className="bg-[#3D8B6E] text-white px-5 py-2 rounded-lg hover:bg-[#347a5f] disabled:opacity-50 font-medium text-sm transition-colors"
                  >
                    {responding ? "処理中..." : "興味あり"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond("declined")}
                    disabled={responding}
                    className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm transition-colors"
                  >
                    辞退する
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: stacked */}
            <div className="md:hidden space-y-3">
              {canRespond && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond("interested")}
                    disabled={responding}
                    className="flex-1 bg-[#3D8B6E] text-white py-2.5 rounded-lg hover:bg-[#347a5f] disabled:opacity-50 font-medium text-sm transition-colors"
                  >
                    {responding ? "処理中..." : "興味あり"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond("declined")}
                    disabled={responding}
                    className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm transition-colors"
                  >
                    辞退する
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Link
                  href={`/companies/${message.companyId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm3.5-3.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  企業ページ
                </Link>
                {message.jobPostingId && (
                  <Link
                    href={`/jobs/${message.jobPostingId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.6-4.03.93-6.17.93s-4.219-.33-6.17-.93C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z"
                        clipRule="evenodd"
                      />
                      <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686A41.454 41.454 0 0110 18c-1.572 0-3.118-.12-4.637-.329C3.985 17.585 3 16.402 3 15.055z" />
                    </svg>
                    求人詳細
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply thread */}
        {replies.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 md:px-6 md:py-5">
            <p className="text-xs font-medium text-gray-500 mb-4">やりとり</p>
            <div className="space-y-3">
              {replies.map((reply) => (
                <ReplyBubble key={reply.id} reply={reply} userId={user.id} />
              ))}
            </div>
          </div>
        )}
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
                className="h-5 w-5 shrink-0 text-[#3D8B6E]"
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

function ReplyBubble({ reply, userId }: { reply: ScoutReply; userId: string }) {
  const isCandidate = reply.senderType === "candidate";

  return (
    <div className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isCandidate ? "bg-[#e8f5ef] text-gray-900" : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
        <p className={`text-xs mt-1 ${isCandidate ? "text-gray-500" : "text-gray-400"}`}>
          {formatDateTime(reply.createdAt)}
        </p>
      </div>
    </div>
  );
}
