"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { ArticlePreviewCard, extractArticleId } from "./ArticlePreviewCard";
import { createPost } from "./api";

export function PostForm() {
  const { user, isLoading } = useAuth();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const maxLength = 280;

  const detectedArticleId = useMemo(() => extractArticleId(content), [content]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 48)}px`;
  }, [content]);

  if (isLoading || !user) return null;

  const initial = user.name ? user.name.charAt(0) : user.username.charAt(0);
  const userId = user.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isPending) return;
    setError("");
    startTransition(async () => {
      try {
        await createPost(userId, content.trim());
        setContent("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "投稿に失敗しました");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-3 pb-2 border-b border-gray-200/80">
      <div className="flex gap-3">
        <span
          className="flex shrink-0 w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white mt-1"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="いまどうしてる？"
            maxLength={maxLength}
            className="w-full resize-none border-none bg-transparent text-lg outline-none placeholder:text-gray-400 text-gray-900 py-2.5 leading-normal"
            style={{ minHeight: 48 }}
          />

          {detectedArticleId && <ArticlePreviewCard articleId={detectedArticleId} />}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-0.5 -ml-2">
              <ActionIcon>
                <ImageIcon />
              </ActionIcon>
              <ActionIcon>
                <GifIcon />
              </ActionIcon>
              <ActionIcon>
                <PollIcon />
              </ActionIcon>
              <ActionIcon>
                <EmojiIcon />
              </ActionIcon>
              <ActionIcon>
                <ScheduleIcon />
              </ActionIcon>
              <ActionIcon>
                <LocationIcon />
              </ActionIcon>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span
                  className={`text-xs ${content.length > maxLength - 20 ? "text-rose-500" : "text-gray-400"}`}
                >
                  {maxLength - content.length}
                </span>
              )}
              <button
                type="submit"
                disabled={!content.trim() || isPending}
                className="rounded-full px-5 py-1.5 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {isPending ? "..." : "ポスト"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
        </div>
      </div>
    </form>
  );
}

function ActionIcon({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--accent-light)] transition-colors"
      style={{ color: "var(--accent)" }}
    >
      {children}
    </button>
  );
}

function ImageIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5.5C3 4.12 4.12 3 5.5 3h13C19.88 3 21 4.12 21 5.5v13c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-13zM5.5 5c-.28 0-.5.22-.5.5v9.86l3.14-3.14c.39-.39 1.02-.39 1.41 0l2.95 2.95 2.95-2.95c.39-.39 1.02-.39 1.41 0L19.5 15V5.5c0-.28-.22-.5-.5-.5h-13zm0 14h13c.28 0 .5-.22.5-.5v-1.64l-3.66-3.66L12.88 16.16c-.39.39-1.02.39-1.41 0L8.5 13.2 5 16.7v1.8c0 .28.22.5.5.5zM16 9c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
    </svg>
  );
}

function GifIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5.5C3 4.12 4.12 3 5.5 3h13C19.88 3 21 4.12 21 5.5v13c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-13zM5.5 5c-.28 0-.5.22-.5.5v13c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5v-13c0-.28-.22-.5-.5-.5h-13zm5.86 5.53c-.17-.42-.52-.53-.79-.53-.59 0-.92.43-.92 1.01v1.98c0 .58.33 1.01.92 1.01.34 0 .63-.14.79-.53h1.44c-.25 1.18-1.12 1.78-2.23 1.78-1.4 0-2.42-.97-2.42-2.26v-1.98c0-1.29 1.02-2.26 2.42-2.26 1.11 0 1.98.6 2.23 1.78h-1.44zm3.58-.28v4.5h-1.5v-4.5H12.5V9.5h3.44v1.25h-.94zm2.56 0v1.28h1.5v1.25h-1.5v1.97h-1.5V9.5h3.44v1.25h-1.94z" />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H6zm0 2h12v10H6V7zm2 2v2h8V9H8zm0 4v2h5v-2H8z" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 9.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm8 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm-4-5.5C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-4c-2.33 0-4.32-1.45-5.12-3.5h1.67c.69 1.19 1.97 2 3.45 2s2.76-.81 3.45-2h1.67c-.8 2.05-2.79 3.5-5.12 3.5z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}
