"use client";

import type { Interview } from "../types";

type Props = {
  interview: Interview;
  top: number;
  height: number;
  onClick: (interview: Interview) => void;
};

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900" },
  completed: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900" },
  cancelled: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-400" },
  no_show: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function InterviewBlock({ interview, top, height, onClick }: Props) {
  const style = STATUS_STYLES[interview.status] ?? STATUS_STYLES.scheduled;
  const isSmall = height < 48;

  return (
    <button
      onClick={() => onClick(interview)}
      className={`absolute left-1 right-1 rounded-lg border px-2 overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${style.bg} ${style.border} ${style.text}`}
      style={{ top: `${top}px`, height: `${Math.max(height, 24)}px` }}
    >
      {isSmall ? (
        <p className="truncate text-xs font-medium leading-6">
          {formatTime(interview.startTime)} {interview.candidateName}
        </p>
      ) : (
        <div className="py-1">
          <p className="truncate text-xs font-semibold">{interview.candidateName}</p>
          <p className="truncate text-[11px] opacity-70">
            {formatTime(interview.startTime)} – {formatTime(interview.endTime)}
          </p>
          {height >= 64 && interview.jobTitle && (
            <p className="truncate text-[11px] opacity-60 mt-0.5">{interview.jobTitle}</p>
          )}
        </div>
      )}
    </button>
  );
}
