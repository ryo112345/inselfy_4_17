"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { cancelInterviewAsCandidate, fetchCandidateInterviews } from "@/features/interview/api";
import { CalendarSlotSelector } from "@/features/interview/components/CalendarSlotSelector";
import type { Interview, InterviewProposal } from "@/features/interview/types";
import { useMessagingWebSocket } from "@/features/messaging/useWebSocket";

type Tab = "pending" | "scheduled" | "past";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "提案中" },
  { key: "scheduled", label: "確定済み" },
  { key: "past", label: "過去" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ja-JP", {
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

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InterviewsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [proposals, setProposals] = useState<InterviewProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCandidateInterviews();
      setInterviews(res.interviews ?? []);
      setProposals(res.pendingProposals ?? []);
    } catch {
      setInterviews([]);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  useMessagingWebSocket({
    type: "candidate",
    enabled: !!user,
    onMessage: useCallback(
      (msg: { type: string; payload: unknown }) => {
        if (msg.type === "proposal_cancelled") {
          const p = msg.payload as { proposal_id: string };
          window.dispatchEvent(
            new CustomEvent("proposal_cancelled", {
              detail: { proposalId: p.proposal_id },
            }),
          );
          load();
        }
      },
      [load],
    ),
  });

  const now = new Date();
  const scheduled = interviews.filter(
    (iv) => iv.status === "scheduled" && new Date(iv.startTime) >= now,
  );
  const past = interviews.filter((iv) => iv.status !== "scheduled" || new Date(iv.startTime) < now);

  const counts: Record<Tab, number> = {
    pending: proposals.length,
    scheduled: scheduled.length,
    past: past.length,
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">面接予定</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  tab === t.key ? "bg-[#3D8B6E] text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#3D8B6E]" />
        </div>
      ) : (
        <>
          {/* Pending Proposals */}
          {tab === "pending" && (
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <EmptyState message="未回答の面接提案はありません" />
              ) : (
                proposals.map((p) => (
                  <CalendarSlotSelector
                    key={p.id}
                    proposalId={p.id}
                    slots={p.slots.map((s) => ({
                      id: s.id,
                      startTime: s.startTime,
                      endTime: s.endTime,
                    }))}
                    message={p.message}
                    durationMinutes={p.durationMinutes}
                    expiresAt={p.expiresAt}
                    companyName={p.companyName}
                    jobTitle={p.jobTitle}
                    onConfirmed={load}
                  />
                ))
              )}
            </div>
          )}

          {/* Scheduled Interviews */}
          {tab === "scheduled" && (
            <div className="space-y-3">
              {scheduled.length === 0 ? (
                <EmptyState message="確定済みの面接はありません" />
              ) : (
                scheduled
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((iv) => <InterviewCard key={iv.id} interview={iv} onCancelled={load} />)
              )}
            </div>
          )}

          {/* Past Interviews */}
          {tab === "past" && (
            <div className="space-y-3">
              {past.length === 0 ? (
                <EmptyState message="過去の面接はありません" />
              ) : (
                past
                  .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                  .map((iv) => <InterviewCard key={iv.id} interview={iv} isPast />)
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16">
      <svg
        className="mb-3 text-gray-300"
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x={3} y={4} width={18} height={18} rx={2} />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  scheduled: { label: "予定", color: "bg-blue-100 text-blue-700" },
  completed: { label: "完了", color: "bg-green-100 text-green-700" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-500" },
  no_show: { label: "不参加", color: "bg-red-100 text-red-700" },
};

function InterviewCard({
  interview,
  isPast,
  onCancelled,
}: {
  interview: Interview;
  isPast?: boolean;
  onCancelled?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const status = STATUS_BADGES[interview.status] ?? STATUS_BADGES.scheduled;
  const days = daysUntil(interview.startTime);

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
      await cancelInterviewAsCandidate(interview.id);
      onCancelled?.();
    } catch {
      showToast("キャンセルに失敗しました", "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${isPast ? "border-gray-100 opacity-75" : "border-gray-200"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3D8B6E]/10 text-[#3D8B6E] text-sm font-semibold">
            {interview.companyName?.charAt(0) ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{interview.companyName}</p>
            {interview.jobTitle && <p className="text-xs text-gray-500">{interview.jobTitle}</p>}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2.5">
          <svg
            className="shrink-0 text-gray-400"
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
          <span className="text-sm text-gray-700">
            {formatDateTime(interview.startTime)} – {formatTimeOnly(interview.endTime)}
          </span>
          {!isPast && interview.status === "scheduled" && days >= 0 && days <= 3 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {days === 0 ? "今日" : days === 1 ? "明日" : `${days}日後`}
            </span>
          )}
        </div>

        {interview.location && (
          <div className="flex items-center gap-2.5">
            <svg
              className="shrink-0 text-gray-400"
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
            <span className="text-sm text-gray-700">{interview.location}</span>
          </div>
        )}

        {interview.meetingUrl && (
          <div className="flex items-center gap-2.5">
            <svg
              className="shrink-0 text-gray-400"
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
              className="text-sm text-blue-600 hover:underline"
            >
              ミーティングリンク
            </a>
          </div>
        )}
      </div>

      {!isPast && interview.status === "scheduled" && (
        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "キャンセル中..." : "キャンセル"}
          </button>
        </div>
      )}
    </div>
  );
}
