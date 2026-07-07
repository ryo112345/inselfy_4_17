"use client";

import { useLayoutEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

type Props = {
  messages: Message[];
  myId: string;
  mySenderType: "candidate" | "company";
  counterpartName: string;
  onSend: (body: string) => Promise<void>;
  onBack?: () => void;
  loading?: boolean;
};

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "今日";
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shouldShowDateSeparator(current: Message, prev: Message | undefined): boolean {
  if (!prev) return true;
  const currentDate = new Date(current.createdAt).toDateString();
  const prevDate = new Date(prev.createdAt).toDateString();
  return currentDate !== prevDate;
}

export function MessageThread({
  messages,
  myId,
  mySenderType,
  counterpartName,
  onSend,
  onBack,
  loading,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-semibold">
          {counterpartName.charAt(0)}
        </div>
        <span className="text-sm font-semibold text-gray-900">{counterpartName}</span>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-[#C8E8F5] px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-400">メッセージを送って会話を始めましょう</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : undefined;
              const showDate = shouldShowDateSeparator(msg, prev);
              const isSystem = msg.senderType === "system";
              const isMine = !isSystem && msg.senderType === mySenderType && msg.senderId === myId;
              const differentSender = prev && prev.senderType !== msg.senderType;

              return (
                <div key={msg.id} className={differentSender && !showDate ? "mt-3" : ""}>
                  {showDate && (
                    <div className="my-4 flex items-center justify-center">
                      <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[10px] font-medium text-gray-500">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  {isSystem ? (
                    <div className="my-3 flex items-center justify-center">
                      <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-500">
                        {msg.body}
                      </span>
                    </div>
                  ) : (
                    <MessageBubble
                      message={msg}
                      isMine={isMine}
                      isCandidate={mySenderType === "candidate"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MessageInput onSend={onSend} />
    </div>
  );
}
