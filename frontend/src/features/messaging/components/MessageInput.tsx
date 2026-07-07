"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";

type Props = {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
};

export function MessageInput({ onSend, disabled }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setBody("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [body, sending, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    }
  }, []);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3D8B6E] focus:ring-1 focus:ring-[#3D8B6E]/20 disabled:opacity-50"
          style={{ minHeight: 40, maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3D8B6E] text-white transition hover:bg-[#347a5f] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
