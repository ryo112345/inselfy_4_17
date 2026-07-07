"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CommentItem } from "./api";
import { createComment, fetchComments } from "./api";

type Props = {
  postId: string;
  currentUserId?: string;
  onCommentCountChange?: (count: number) => void;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}秒`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}日`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function CommentSection({ postId, currentUserId, onCommentCountChange }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [content, setContent] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchComments(postId, 50)
      .then((res) => {
        if (!cancelled) {
          setComments(res.items ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [postId, reloadKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const newComment = await createComment(postId, content.trim());
      setComments((prev) => [...prev, newComment]);
      setContent("");
      onCommentCountChange?.(comments.length + 1);
    } catch {
      // 入力値は保持したままエラーを表示し、再送できるようにする
      setSubmitError("コメントの投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {loading ? (
        <div className="text-sm text-gray-400 py-2">読み込み中...</div>
      ) : loadError ? (
        <div className="flex items-center gap-2 py-1">
          <span className="text-sm text-red-600">コメントの読み込みに失敗しました</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            再読み込み
          </button>
        </div>
      ) : (
        <>
          {comments.length === 0 && (
            <div className="text-sm text-gray-400 py-1">コメントはまだありません</div>
          )}
          <div className="space-y-3">
            {comments.map((c) => (
              <CommentCard key={c.id} comment={c} />
            ))}
          </div>
        </>
      )}
      {currentUserId && submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コメントを書く..."
            rows={1}
            maxLength={500}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "var(--accent)" }}
          >
            送信
          </button>
        </form>
      )}
    </div>
  );
}

function CommentCard({ comment }: { comment: CommentItem }) {
  const initial = comment.name ? comment.name.charAt(0) : comment.username.charAt(0);

  return (
    <div className="flex gap-2">
      <Link href={`/profile/${comment.username}`} className="shrink-0">
        <span
          className="flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {initial}
        </span>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Link
            href={`/profile/${comment.username}`}
            className="font-semibold text-[13px] text-gray-900 hover:underline"
          >
            {comment.name || comment.username}
          </Link>
          <span className="text-[13px] text-gray-400">@{comment.username}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[13px] text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
