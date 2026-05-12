"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostItem, CommentItem } from "@/features/timeline/api";
import { toggleLike, toggleRepost, createComment } from "@/features/timeline/api";
import { useAuth } from "@/features/auth/auth-context";

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
    try {
      const newComment = await createComment(post.id, commentContent.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentCount((c) => c + 1);
      setCommentContent("");
    } catch {
      // ignore
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
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">ポスト</h1>
      </div>

      <article className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile/${post.username}`}>
            <span className="flex w-12 h-12 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
              {initial}
            </span>
          </Link>
          <div>
            <Link href={`/profile/${post.username}`} className="font-bold text-[15px] text-gray-900 hover:underline block">
              {post.name || post.username}
            </Link>
            <span className="text-[14px] text-gray-400">@{post.username}</span>
          </div>
        </div>

        <p className="text-[17px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed mb-3">
          {post.content}
        </p>

        {post.quotedPost && (
          <div
            className="rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50/50 transition-colors cursor-pointer mb-3"
            onClick={() => router.push(`/post/${post.quotedPost!.id}`)}
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: "var(--accent)" }}>
                  {post.quotedPost.name?.charAt(0) || post.quotedPost.username.charAt(0)}
                </span>
                <span className="font-bold text-[13px] text-gray-900 truncate">{post.quotedPost.name || post.quotedPost.username}</span>
                <span className="text-[13px] text-gray-400 truncate">@{post.quotedPost.username}</span>
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
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            まだ返信はありません
          </div>
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
        <span className="flex w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
          {initial}
        </span>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Link href={`/profile/${comment.username}`} className="font-bold text-[15px] text-gray-900 hover:underline truncate">
            {comment.name || comment.username}
          </Link>
          <span className="text-[15px] text-gray-400 truncate">@{comment.username}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[15px] text-gray-400 whitespace-nowrap">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>
      </div>
    </article>
  );
}

function ActionButton({ icon, active, activeColor, hoverColor, onClick }: {
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
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1.751 10c.003-.72.01-1.597.992-2.685C3.903 6.118 5.88 5 8.25 5h7.5c2.37 0 4.348 1.118 5.508 2.315.981 1.088.988 1.965.992 2.685v3c-.004.72-.011 1.597-.992 2.685C20.098 16.882 18.12 18 15.75 18H14l-5.25 4.5V18H8.25c-2.37 0-4.348-1.118-5.508-2.315-.981-1.088-.988-1.965-.992-2.685v-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h4v2h-4c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2h-4V4h4c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.09-.806-1.09c-1.211-1.65-2.668-2.22-3.89-2.16-1.4.07-2.698.96-3.116 2.56-.418 1.602.106 3.461 1.972 5.478l.17.177 5.45 5.54c.138.14.32.14.457 0l5.45-5.54.172-.177c1.866-2.017 2.39-3.876 1.972-5.478-.418-1.6-1.716-2.49-3.116-2.56z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LikeIconFilled() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.09-.806-1.09c-1.211-1.65-2.668-2.22-3.89-2.16-1.4.07-2.698.96-3.116 2.56-.418 1.602.106 3.461 1.972 5.478l.17.177 5.45 5.54c.138.14.32.14.457 0l5.45-5.54.172-.177c1.866-2.017 2.39-3.876 1.972-5.478-.418-1.6-1.716-2.49-3.116-2.56z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
    </svg>
  );
}
