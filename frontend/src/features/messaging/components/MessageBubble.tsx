"use client";

import type { Message } from "../types";

type Props = {
  message: Message;
  isMine: boolean;
  showTimestamp?: boolean;
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isMine, showTimestamp = true }: Props) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 ${
          isMine
            ? "bg-[#3D8B6E] text-white rounded-2xl rounded-br-sm"
            : "bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.body}
        </p>
        {showTimestamp && (
          <p
            className={`text-[10px] mt-1 ${
              isMine ? "text-white/60" : "text-gray-400"
            }`}
          >
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}
