"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useUnreadScout } from "@/features/scout/unread-context";
import {
  fetchReceivedScoutDetail,
  respondToScout,
  replyToScout,
} from "@/features/scout/api";
import type { ScoutDetail, ScoutReply, ScoutStatus } from "@/features/scout/types";

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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ja-JP")} ${d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

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

  async function handleRespond(response: "interested" | "declined") {
    if (responding) return;
    if (
      response === "declined" &&
      !confirm("このスカウトを辞退しますか?")
    ) {
      return;
    }
    setResponding(true);
    try {
      await respondToScout(scoutId, response);
      await loadDetail();
    } catch {
      alert("応答に失敗しました");
    } finally {
      setResponding(false);
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || sending) return;
    setSending(true);
    try {
      await replyToScout(scoutId, replyBody.trim());
      setReplyBody("");
      await loadDetail();
    } catch {
      alert("返信の送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen pl-[50px] bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen pl-[50px] bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error ?? "データが見つかりません"}</p>
      </div>
    );
  }

  const { message, replies } = detail;
  const badge = STATUS_BADGE[message.status];
  const remaining = daysRemaining(message.expiresAt);
  const canRespond = message.status === "sent" || message.status === "opened";
  const canReply = message.status !== "expired";

  return (
    <div className="min-h-screen pl-[50px] bg-gray-50">
      <div className="max-w-[800px] mx-auto px-6 py-8">
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push("/scout")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
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

        {/* Scout message card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {/* Company name */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {message.companyName}
          </h2>

          {/* Job title */}
          {message.jobTitle && (
            <p className="text-sm text-gray-500 mb-3">{message.jobTitle}</p>
          )}

          {/* Subject */}
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {message.subject}
          </h3>

          {/* Body */}
          <div className="bg-gray-50 rounded-lg p-5 mb-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {message.body}
            </p>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-gray-400">
              受信: {formatDate(message.sentAt)}
            </span>
            {message.expiresAt && (
              <span
                className={
                  remaining === "期限切れ" || remaining === "今日まで"
                    ? "text-red-500 font-medium"
                    : "text-gray-400"
                }
              >
                期限: {formatDate(message.expiresAt)}
                {remaining && ` (${remaining})`}
              </span>
            )}
          </div>
        </div>

        {/* Response buttons */}
        {canRespond && (
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleRespond("interested")}
              disabled={responding}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors"
            >
              {responding ? "処理中..." : "興味あり"}
            </button>
            <button
              type="button"
              onClick={() => handleRespond("declined")}
              disabled={responding}
              className="border border-red-300 text-red-600 px-6 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium transition-colors"
            >
              辞退する
            </button>
          </div>
        )}

        {/* Reply thread */}
        {replies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              メッセージスレッド
            </h4>
            <div className="space-y-3">
              {replies.map((reply) => (
                <ReplyBubble key={reply.id} reply={reply} userId={user.id} />
              ))}
            </div>
          </div>
        )}

        {/* Reply form */}
        {canReply && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              返信を送る
            </h4>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="メッセージを入力..."
              className="border border-gray-300 rounded-lg px-3 py-2 w-full min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-y"
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={handleReply}
                disabled={!replyBody.trim() || sending}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm transition-colors"
              >
                {sending ? "送信中..." : "送信"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyBubble({
  reply,
  userId,
}: {
  reply: ScoutReply;
  userId: string;
}) {
  const isCandidate = reply.senderType === "candidate";

  return (
    <div
      className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isCandidate
            ? "bg-blue-100 text-blue-900"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {reply.body}
        </p>
        <p
          className={`text-xs mt-1 ${
            isCandidate ? "text-blue-500" : "text-gray-400"
          }`}
        >
          {formatDateTime(reply.createdAt)}
        </p>
      </div>
    </div>
  );
}
