"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  ArticlePreviewCard,
  extractArticleId,
  removeArticleUrl,
} from "@/features/timeline/ArticlePreviewCard";
import type { CommentItem, PostItem } from "@/features/timeline/api";
import { createComment, toggleLike, toggleRepost } from "@/features/timeline/api";

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  post: PostItem;
  comments: CommentItem[];
  currentUserId?: string;
};

export function PostDetail({ post, comments: initialComments, currentUserId }: Props) {
  const router = useRouter();
  const initial = post.name ? post.name.charAt(0) : post.username.charAt(0);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.repostedByMe);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [comments, setComments] = useState(initialComments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleLike() {
    if (!currentUserId) return;
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(prevCount + (wasLiked ? -1 : 1));
    try {
      const res = await toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    }
  }

  async function handleRepost() {
    if (!currentUserId) return;
    const wasReposted = reposted;
    const prevCount = repostCount;
    setReposted(!wasReposted);
    setRepostCount(prevCount + (wasReposted ? -1 : 1));
    try {
      const res = await toggleRepost(post.id);
      setReposted(res.reposted);
      setRepostCount(res.count);
    } catch {
      setReposted(wasReposted);
      setRepostCount(prevCount);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    setCommentError("");
    try {
      const newComment = await createComment(post.id, commentContent.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentCount((c) => c + 1);
      setCommentContent("");
    } catch {
      // 入力値は保持したままエラーを表示し、再送できるようにする
      setCommentError("返信の投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [commentContent]);

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/80">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">ポスト</h1>
      </div>

      <article className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile/${post.username}`}>
            <span
              className="flex w-12 h-12 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {initial}
            </span>
          </Link>
          <div>
            <Link
              href={`/profile/${post.username}`}
              className="font-bold text-[15px] text-gray-900 hover:underline block"
            >
              {post.name || post.username}
            </Link>
            <span className="text-[14px] text-gray-400">@{post.username}</span>
          </div>
        </div>

        {(() => {
          const articleId = extractArticleId(post.content);
          const displayContent = articleId ? removeArticleUrl(post.content) : post.content;
          return (
            <>
              {displayContent && (
                <p className="text-[17px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed mb-3">
                  {displayContent}
                </p>
              )}
              {articleId && (
                <div className="mb-3">
                  <ArticlePreviewCard articleId={articleId} />
                </div>
              )}
            </>
          );
        })()}

        {post.quotedPost && (
          <div
            className="rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50/50 transition-colors cursor-pointer mb-3"
            onClick={() => router.push(`/post/${post.quotedPost!.id}`)}
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {post.quotedPost.name?.charAt(0) || post.quotedPost.username.charAt(0)}
                </span>
                <span className="font-bold text-[13px] text-gray-900 truncate">
                  {post.quotedPost.name || post.quotedPost.username}
                </span>
                <span className="text-[13px] text-gray-400 truncate">
                  @{post.quotedPost.username}
                </span>
              </div>
              <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed line-clamp-3">
                {post.quotedPost.content}
              </p>
            </div>
          </div>
        )}

        <div className="text-[14px] text-gray-400 py-2 border-b border-gray-200/80">
          {formatDate(post.createdAt)}
        </div>

        {(likeCount > 0 || repostCount > 0) && (
          <div className="flex gap-5 py-2 border-b border-gray-200/80 text-[14px]">
            {repostCount > 0 && (
              <span>
                <span className="font-bold text-gray-900">{repostCount}</span>
                <span className="text-gray-400 ml-1">リポスト</span>
              </span>
            )}
            {likeCount > 0 && (
              <span>
                <span className="font-bold text-gray-900">{likeCount}</span>
                <span className="text-gray-400 ml-1">いいね</span>
              </span>
            )}
          </div>
        )}

        <div className="flex justify-around py-1 border-b border-gray-200/80">
          <ActionButton
            icon={<CommentIcon />}
            active={false}
            activeColor=""
            hoverColor="hover:bg-blue-50 hover:text-blue-500"
            onClick={() => textareaRef.current?.focus()}
          />
          <ActionButton
            icon={<RetweetIcon />}
            active={reposted}
            activeColor="text-green-600"
            hoverColor="hover:bg-green-50 hover:text-green-600"
            onClick={handleRepost}
          />
          <ActionButton
            icon={liked ? <LikeIconFilled /> : <LikeIcon />}
            active={liked}
            activeColor="text-[#F91880]"
            hoverColor="hover:bg-[#F918800d] hover:text-[#F91880]"
            onClick={handleLike}
          />
          <ActionButton
            icon={<ShareIcon />}
            active={false}
            activeColor=""
            hoverColor="hover:bg-blue-50 hover:text-blue-500"
          />
        </div>
      </article>

      {currentUserId && (
        <form onSubmit={handleComment} className="flex gap-3 px-4 py-3 border-b border-gray-200/80">
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="返信をポスト"
              maxLength={500}
              className="w-full resize-none border-none bg-transparent text-[15px] outline-none placeholder:text-gray-400 text-gray-900 py-1 leading-normal"
              style={{ minHeight: 40 }}
            />
            {commentError && <p className="text-sm text-red-600 mt-1">{commentError}</p>}
          </div>
          <button
            type="submit"
            disabled={!commentContent.trim() || submitting}
            className="self-end shrink-0 rounded-full px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "var(--accent)" }}
          >
            返信
          </button>
        </form>
      )}

      <div>
        {comments.map((c) => (
          <CommentCard key={c.id} comment={c} />
        ))}
        {comments.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">まだ返信はありません</div>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment }: { comment: CommentItem }) {
  const initial = comment.name ? comment.name.charAt(0) : comment.username.charAt(0);
  return (
    <article className="flex gap-3 px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors">
      <Link href={`/profile/${comment.username}`} className="shrink-0">
        <span
          className="flex w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {initial}
        </span>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Link
            href={`/profile/${comment.username}`}
            className="font-bold text-[15px] text-gray-900 hover:underline truncate"
          >
            {comment.name || comment.username}
          </Link>
          <span className="text-[15px] text-gray-400 truncate">@{comment.username}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[15px] text-gray-400 whitespace-nowrap">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>
      </div>
    </article>
  );
}

function ActionButton({
  icon,
  active,
  activeColor,
  hoverColor,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  activeColor: string;
  hoverColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${active ? activeColor : "text-gray-400"} ${hoverColor}`}
    >
      {icon}
    </button>
  );
}

function CommentIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function LikeIconFilled() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
