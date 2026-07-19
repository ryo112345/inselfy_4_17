"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FieldError, fieldAriaProps } from "@/components/form/FieldError";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { useToast } from "@/components/ui";
import {
  getCompanyScoutsGetCompanyScoutDetailQueryKey,
  useCompanyScoutsCompanyScoutReply,
  useCompanyScoutsGetCompanyScoutDetail,
} from "@/external/client/api/orval/generated/endpoints/company-scouts/company-scouts";
import { CompanyScoutsCompanyScoutReplyBody } from "@/external/client/api/orval/generated/zod/company-scouts/company-scouts.zod";
import type { ScoutStatus } from "@/features/scout/types";
import { getErrorMessage } from "@/lib/api-result";
import { formatDateTime } from "@/lib/date";

const STATUS_BADGE: Record<ScoutStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "下書き" },
  sent: { bg: "bg-blue-50", text: "text-blue-700", label: "送信済み" },
  opened: { bg: "bg-yellow-50", text: "text-yellow-700", label: "開封済み" },
  replied: { bg: "bg-green-50", text: "text-green-700", label: "返信あり" },
  interested: { bg: "bg-emerald-50", text: "text-emerald-700", label: "興味あり" },
  declined: { bg: "bg-red-50", text: "text-red-700", label: "辞退" },
  expired: { bg: "bg-gray-100", text: "text-gray-500", label: "期限切れ" },
};

export default function ScoutDetailPage() {
  const params = useParams();
  const scoutId = params.scoutId as string;

  const [replyBody, setReplyBody] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const detailQuery = useCompanyScoutsGetCompanyScoutDetail(scoutId);
  const detail = detailQuery.data ?? null;
  const loading = detailQuery.isPending;
  const error = detailQuery.error?.message ?? null;

  const replyMutation = useCompanyScoutsCompanyScoutReply();
  const sending = replyMutation.isPending;
  const { fieldErrors, validate, clearField } = useFieldErrors();

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    if (!validate(CompanyScoutsCompanyScoutReplyBody, { body: replyBody.trim() })) return;
    try {
      await replyMutation.mutateAsync({ scoutId, data: { body: replyBody.trim() } });
      setReplyBody("");
      await queryClient.invalidateQueries({
        queryKey: getCompanyScoutsGetCompanyScoutDetailQueryKey(scoutId),
      });
    } catch (e) {
      showToast(getErrorMessage(e, "返信の送信に失敗しました"), "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-red-500 text-sm">{error ?? "スカウトが見つかりません"}</p>
        <Link
          href="/company/scout"
          className="text-sm text-[#2979ff] hover:underline mt-4 inline-block"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  const { message, replies } = detail;
  const badge = STATUS_BADGE[message.status];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/company/scout"
        className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        スカウト一覧
      </Link>

      {/* Scout message card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{message.subject}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>
                候補者: <span className="font-medium text-gray-700">{message.candidateName}</span>
              </span>
              {message.jobTitle && (
                <span>
                  求人: <span className="font-medium text-gray-700">{message.jobTitle}</span>
                </span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex gap-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
          <span>送信日: {formatDateTime(message.sentAt)}</span>
          {message.openedAt && <span>開封日: {formatDateTime(message.openedAt)}</span>}
          {message.repliedAt && <span>返信日: {formatDateTime(message.repliedAt)}</span>}
          {message.expiresAt && <span>期限: {formatDateTime(message.expiresAt)}</span>}
        </div>

        {/* Body */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>
      </div>

      {/* Reply thread */}
      {replies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">返信スレッド</h2>
          {replies.map((reply) => {
            const isCompany = reply.senderType === "company";
            return (
              <div
                key={reply.id}
                className={`rounded-xl p-4 max-w-[80%] ${
                  isCompany
                    ? "ml-auto bg-blue-50 border border-blue-100"
                    : "mr-auto bg-white border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-medium ${isCompany ? "text-blue-600" : "text-gray-600"}`}
                  >
                    {isCompany ? "自社" : "候補者"}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply form */}
      {message.status !== "declined" && message.status !== "expired" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">返信する</h2>
          <textarea
            {...fieldAriaProps("body", fieldErrors.body)}
            value={replyBody}
            onChange={(e) => {
              setReplyBody(e.target.value);
              clearField("body");
            }}
            placeholder="返信メッセージを入力..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] text-sm resize-y outline-none aria-invalid:border-red-400 aria-invalid:bg-red-50/60"
          />
          <FieldError name="body" error={fieldErrors.body} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReply}
              disabled={!replyBody.trim() || sending}
              className="bg-[#2979ff] text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? "送信中..." : "返信を送る"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
