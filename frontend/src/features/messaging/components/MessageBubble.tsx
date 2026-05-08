"use client";

import type { Message } from "../types";
import { ProposalCard } from "@/features/interview/components/ProposalCard";

type Props = {
  message: Message;
  isMine: boolean;
  showTimestamp?: boolean;
  isCandidate?: boolean;
  onProposalConfirmed?: () => void;
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function StructuredMessageCard({ message, isCandidate, onProposalConfirmed }: { message: Message; isCandidate?: boolean; onProposalConfirmed?: () => void }) {
  const type = message.messageType;

  if (type === "interview_proposal") {
    const meta = message.metadata as {
      proposal_id?: string;
      slots?: { id: string; start_time: string; end_time: string }[];
      location?: string;
      duration_minutes?: number;
      expires_at?: string;
    } | undefined;
    if (meta?.proposal_id && meta.slots) {
      return (
        <ProposalCard
          proposalId={meta.proposal_id}
          slots={meta.slots}
          message={message.body}
          location={meta.location}
          durationMinutes={meta.duration_minutes}
          expiresAt={meta.expires_at}
          isCandidate={isCandidate ?? false}
          onConfirmed={onProposalConfirmed}
        />
      );
    }
  }

  if (type === "interview_confirmed") {
    const meta = message.metadata as { start_time?: string; end_time?: string } | undefined;
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-semibold text-green-800">面接日程が確定しました</span>
        </div>
        {meta?.start_time && (
          <p className="text-sm text-green-700 mt-1">
            {new Date(meta.start_time).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
            {" "}
            {new Date(meta.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            {meta.end_time && ` - ${new Date(meta.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        )}
        {message.body && <p className="text-sm text-green-700 mt-1">{message.body}</p>}
      </div>
    );
  }

  if (type === "interview_cancelled") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-semibold text-red-800">面接がキャンセルされました</span>
        </div>
        {message.body && <p className="text-sm text-red-700 mt-1">{message.body}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{message.body}</p>
    </div>
  );
}

export function MessageBubble({ message, isMine, showTimestamp = true, isCandidate, onProposalConfirmed }: Props) {
  const isStructured = message.messageType && message.messageType !== "text";

  if (isStructured) {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-[85%] w-full">
          <StructuredMessageCard message={message} isCandidate={isCandidate} onProposalConfirmed={onProposalConfirmed} />
          {showTimestamp && (
            <p className="text-[10px] text-gray-400 text-center mt-1">{formatTime(message.createdAt)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
      {isMine && showTimestamp && (
        <p className="text-[10px] text-gray-400 mb-1">{formatTime(message.createdAt)}</p>
      )}
      <div className={`relative max-w-[75%] ${isMine ? "mr-2" : "ml-2"}`}>
        <div
          className={`px-4 py-2.5 shadow-sm ${
            isMine
              ? "bg-[#6EE580] text-gray-900 rounded-2xl rounded-br-none"
              : "bg-white text-gray-900 rounded-2xl rounded-bl-none"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.body}
          </p>
        </div>
        {/* tail */}
        <div
          className={`absolute bottom-0 w-3 h-3 ${
            isMine
              ? "right-[-6px] bg-[#6EE580]"
              : "left-[-6px] bg-white"
          }`}
          style={{
            clipPath: isMine
              ? "polygon(0 0, 0 100%, 100% 100%)"
              : "polygon(100% 0, 0 100%, 100% 100%)",
          }}
        />
      </div>
      {!isMine && showTimestamp && (
        <p className="text-[10px] text-gray-400 mb-1">{formatTime(message.createdAt)}</p>
      )}
    </div>
  );
}
