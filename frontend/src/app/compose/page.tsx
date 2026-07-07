"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { ArticlePreviewCard, extractArticleId } from "@/features/timeline/ArticlePreviewCard";
import { createPost } from "@/features/timeline/api";

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const maxLength = 280;

  const detectedArticleId = useMemo(() => extractArticleId(content), [content]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, [content]);

  if (isLoading) return null;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">ログインしてください</p>
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0) : user.username.charAt(0);
  const remaining = maxLength - content.length;

  async function handleSubmit() {
    if (!content.trim() || isPending || !user) return;
    setError("");
    startTransition(async () => {
      try {
        await createPost(user.id, content.trim());
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "投稿に失敗しました");
      }
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 border-b border-gray-200/80 bg-white">
        <button onClick={() => router.back()} className="text-[15px] text-gray-600">
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
          className="rounded-full px-5 py-1.5 text-sm font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {isPending ? "..." : "ポスト"}
        </button>
      </div>

      <div className="flex gap-3 px-4 pt-4">
        <span
          className="flex shrink-0 w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white mt-0.5"
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
            className="w-full resize-none border-none bg-transparent text-[17px] outline-none placeholder:text-gray-400 text-gray-900 py-1 leading-relaxed"
            style={{ minHeight: 120 }}
          />

          {detectedArticleId && <ArticlePreviewCard articleId={detectedArticleId} />}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 border-t border-gray-200/80 bg-white">
        <div />
        <span className={`text-sm ${remaining <= 20 ? "text-rose-500" : "text-gray-400"}`}>
          {remaining}
        </span>
      </div>

      {error && (
        <div className="px-4 pt-2">
          <p className="text-xs text-rose-500">{error}</p>
        </div>
      )}
    </div>
  );
}
