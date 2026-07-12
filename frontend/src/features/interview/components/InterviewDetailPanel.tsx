"use client";

import { useState } from "react";
import { Modal, useConfirm, useToast } from "@/components/ui";
import { cancelInterviewAsCompany } from "../api";
import type { Interview } from "../types";

type Props = {
  interview: Interview;
  onClose: () => void;
  onCancelled: () => void;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) +
    " " +
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "予定", color: "bg-blue-100 text-blue-700" },
  completed: { label: "完了", color: "bg-green-100 text-green-700" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-500" },
  no_show: { label: "不参加", color: "bg-red-100 text-red-700" },
};

export function InterviewDetailPanel({ interview, onClose, onCancelled }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const status = STATUS_LABELS[interview.status] ?? STATUS_LABELS.scheduled;

  const handleCancel = async () => {
    if (
      !(await confirmDialog({
        title: "面接のキャンセル",
        message: "この面接をキャンセルしますか？",
        confirmLabel: "キャンセルする",
        cancelLabel: "戻る",
        destructive: true,
      }))
    )
      return;
    setCancelling(true);
    try {
      await cancelInterviewAsCompany(interview.id);
      onCancelled();
    } catch {
      showToast("キャンセルに失敗しました", "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="面接詳細"
      size="md"
      footer={
        interview.status === "scheduled" ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "キャンセル中..." : "面接をキャンセル"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            {interview.candidateName?.charAt(0) ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{interview.candidateName}</p>
            {interview.jobTitle && <p className="text-xs text-gray-500">{interview.jobTitle}</p>}
          </div>
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-gray-400"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x={3} y={4} width={18} height={18} rx={2} />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <div className="text-sm text-gray-700">
              <p>{formatDateTime(interview.startTime)}</p>
              <p className="text-gray-500">
                {formatTimeOnly(interview.startTime)} – {formatTimeOnly(interview.endTime)}
              </p>
            </div>
          </div>

          {interview.location && (
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-gray-400"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                <circle cx={12} cy={10} r={3} />
              </svg>
              <p className="text-sm text-gray-700">{interview.location}</p>
            </div>
          )}

          {interview.meetingUrl && (
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-gray-400"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <a
                href={interview.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {interview.meetingUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
