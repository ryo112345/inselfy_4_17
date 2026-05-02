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
