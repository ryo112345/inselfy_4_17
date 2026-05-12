"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostItem } from "./api";
import { toggleLike, toggleRepost, createPost } from "./api";
import { useAuth } from "@/features/auth/auth-context";
import { CommentSection } from "./CommentSection";

type Props = {
  post: PostItem;
  currentUserId?: string;
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

export function PostCard({ post, currentUserId }: Props) {
  const initial = post.name ? post.name.charAt(0) : post.username.charAt(0);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [reposted, setReposted] = useState(post.repostedByMe);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [liking, setLiking] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [repostAnimating, setRepostAnimating] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRepostMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRepostMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showRepostMenu]);

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (liking || !currentUserId) return;
    setLiking(true);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(prevCount + (wasLiked ? -1 : 1));
    if (!wasLiked) {
      setLikeAnimating(true);
    }
    try {
      const res = await toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  }

  async function handleRepost(e: React.MouseEvent) {
    e.stopPropagation();
    setShowRepostMenu(false);
    if (reposting || !currentUserId) return;
    setReposting(true);
    const wasReposted = reposted;
    const prevCount = repostCount;
    setReposted(!wasReposted);
    setRepostCount(prevCount + (wasReposted ? -1 : 1));
    if (!wasReposted) {
      setRepostAnimating(true);
    }
    try {
      const res = await toggleRepost(post.id);
      setReposted(res.reposted);
      setRepostCount(res.count);
    } catch {
      setReposted(wasReposted);
      setRepostCount(prevCount);
    } finally {
      setReposting(false);
    }
  }

  function handleQuoteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowRepostMenu(false);
    setShowQuoteForm(true);
  }

  function handleRepostButtonClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUserId) return;
    setShowRepostMenu((prev) => !prev);
  }

  function handleCommentClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowComments((prev) => !prev);
  }

  const router = useRouter();

  function handlePostClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("button") || target.closest("textarea") || target.closest("form")) return;
    router.push(`/post/${post.id}`);
  }

  return (
    <article className="border-b border-gray-200/80 px-4 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={handlePostClick}>
      {post.isRepost && (
        <div className="flex items-center gap-2 ml-12 mb-1 text-[13px] text-gray-400">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h4v2h-4c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2h-4V4h4c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
          </svg>
          <span>リポスト</span>
        </div>
      )}
      <div className="flex gap-3">
        <div className="shrink-0">
          <span className="flex w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
            {initial}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] text-gray-900 truncate">
              {post.name || post.username}
            </span>
            <span className="text-[15px] text-gray-400 truncate">
              @{post.username}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-[15px] text-gray-400 whitespace-nowrap">{timeAgo(post.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
          {post.quotedPost && (
            <QuotedPostCard quote={post.quotedPost} />
          )}
          <div className="flex items-center mt-2 -ml-2 max-w-[425px] justify-between">
            <PostAction
              icon={<CommentIcon />}
              count={commentCount}
              hoverColor="hover:bg-blue-50 hover:text-blue-500"
              onClick={handleCommentClick}
              active={showComments}
              activeColor="text-blue-500"
            />
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleRepostButtonClick}
                className={`group flex items-center transition-colors ${reposted ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-green-50 hover:text-green-600">
                  <span
                    className={repostAnimating ? "repost-icon-pop" : ""}
                    onAnimationEnd={() => setRepostAnimating(false)}
                  >
                    <RetweetIcon />
                  </span>
                  {repostAnimating && <span className="repost-ring" />}
                </span>
                <span className="text-[13px] -ml-1 w-5">{repostCount > 0 ? repostCount : ""}</span>
              </button>
              {showRepostMenu && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 rounded-lg bg-white py-1 z-50 animate-popover-in whitespace-nowrap"
                  style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }}
                >
                  <button
                    onClick={handleRepost}
                    className="group flex items-center gap-3 w-full px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <span className="text-gray-400 group-hover:text-green-600 transition-colors duration-150">
                      <RetweetIcon />
                    </span>
                    <span className="font-semibold">{reposted ? "リポストを取り消す" : "リポスト"}</span>
                  </button>
                  <button
                    onClick={handleQuoteClick}
                    className="group flex items-center gap-3 w-full px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <span className="text-gray-400 group-hover:text-blue-500 transition-colors duration-150">
                      <QuoteIcon />
                    </span>
                    <span className="font-semibold">引用</span>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleLike}
              className={`group flex items-center transition-colors ${liked ? "text-[#F91880]" : "text-gray-400"}`}
            >
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-[#F918800d] hover:text-[#F91880]">
                <span
                  className={likeAnimating ? "like-icon-pop" : ""}
                  onAnimationEnd={() => setLikeAnimating(false)}
                >
                  {liked ? <LikeIconFilled /> : <LikeIcon />}
                </span>
                {likeAnimating && <span className="like-ring" />}
                {likeAnimating && (
                  <>
                    <span className="like-particle" style={{ "--angle": "0deg", "--color": "#F91880" } as React.CSSProperties} />
                    <span className="like-particle" style={{ "--angle": "60deg", "--color": "#FC5CA8" } as React.CSSProperties} />
                    <span className="like-particle" style={{ "--angle": "120deg", "--color": "#F91880" } as React.CSSProperties} />
                    <span className="like-particle" style={{ "--angle": "180deg", "--color": "#FC5CA8" } as React.CSSProperties} />
                    <span className="like-particle" style={{ "--angle": "240deg", "--color": "#F91880" } as React.CSSProperties} />
                    <span className="like-particle" style={{ "--angle": "300deg", "--color": "#FC5CA8" } as React.CSSProperties} />
                  </>
                )}
              </span>
              <span className="text-[13px] -ml-1 w-5">{likeCount > 0 ? likeCount : ""}</span>
            </button>
            <PostAction icon={<ViewIcon />} hoverColor="hover:bg-blue-50 hover:text-blue-500" />
            <PostAction icon={<ShareIcon />} hoverColor="hover:bg-blue-50 hover:text-blue-500" />
          </div>
          {showComments && (
            <CommentSection
              postId={post.id}
              currentUserId={currentUserId}
              onCommentCountChange={setCommentCount}
            />
          )}
          {showQuoteForm && (
            <QuoteForm
              quotedPost={post}
              onClose={() => setShowQuoteForm(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function QuotedPostCard({ quote }: { quote: { id?: string; content: string; username: string; name: string; createdAt: string } }) {
  const initial = quote.name ? quote.name.charAt(0) : quote.username.charAt(0);
  const router = useRouter();
  const content = (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: "var(--accent)" }}>
          {initial}
        </span>
        <span className="font-bold text-[13px] text-gray-900 truncate">{quote.name || quote.username}</span>
        <span className="text-[13px] text-gray-400 truncate">@{quote.username}</span>
        <span className="text-gray-300">·</span>
        <span className="text-[13px] text-gray-400 whitespace-nowrap">{timeAgo(quote.createdAt)}</span>
      </div>
      <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed line-clamp-3">
        {quote.content}
      </p>
    </div>
  );
  return (
    <div
      className={`mt-2 rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50/50 transition-colors ${quote.id ? "cursor-pointer" : ""}`}
      onClick={quote.id ? (e) => { e.stopPropagation(); router.push(`/post/${quote.id}`); } : undefined}
    >
      {content}
    </div>
  );
}

function QuoteForm({ quotedPost, onClose }: { quotedPost: PostItem; onClose: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const maxLength = 280;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [content]);

  if (!user) return null;

  const initial = user.name ? user.name.charAt(0) : user.username.charAt(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || !user) return;
    setSubmitting(true);
    setError("");
    try {
      await createPost(user.id, content.trim(), quotedPost.id);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <span className="flex shrink-0 w-8 h-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コメントを追加..."
              maxLength={maxLength}
              className="w-full resize-none border-none bg-transparent text-[15px] outline-none placeholder:text-gray-400 text-gray-900 py-1 leading-normal"
              style={{ minHeight: 40 }}
            />
          </div>
        </div>
        <QuotedPostCard quote={{
          content: quotedPost.content,
          username: quotedPost.username,
          name: quotedPost.name,
          createdAt: quotedPost.createdAt,
        }} />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {content.length > 0 && (
              <span className={`text-xs ${content.length > maxLength - 20 ? "text-rose-500" : "text-gray-400"}`}>
                {maxLength - content.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded-full px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40 transition-colors"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {submitting ? "..." : "投稿"}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </form>
    </div>
  );
}

function PostAction({
  icon,
  count,
  hoverColor,
  onClick,
  active,
  activeColor,
}: {
  icon: React.ReactNode;
  count?: number;
  hoverColor: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center transition-colors ${active && activeColor ? activeColor : "text-gray-400"}`}
    >
      <span className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${hoverColor}`}>
        {icon}
      </span>
      <span className="text-[13px] -ml-1 w-5">{count !== undefined && count > 0 ? count : ""}</span>
    </button>
  );
}

function CommentIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1.751 10c.003-.72.01-1.597.992-2.685C3.903 6.118 5.88 5 8.25 5h7.5c2.37 0 4.348 1.118 5.508 2.315.981 1.088.988 1.965.992 2.685v3c-.004.72-.011 1.597-.992 2.685C20.098 16.882 18.12 18 15.75 18H14l-5.25 4.5V18H8.25c-2.37 0-4.348-1.118-5.508-2.315-.981-1.088-.988-1.965-.992-2.685v-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2h4v2h-4c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM19.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2h-4V4h4c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="M12 22h10" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.09-.806-1.09c-1.211-1.65-2.668-2.22-3.89-2.16-1.4.07-2.698.96-3.116 2.56-.418 1.602.106 3.461 1.972 5.478l.17.177 5.45 5.54c.138.14.32.14.457 0l5.45-5.54.172-.177c1.866-2.017 2.39-3.876 1.972-5.478-.418-1.6-1.716-2.49-3.116-2.56z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LikeIconFilled() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.09-.806-1.09c-1.211-1.65-2.668-2.22-3.89-2.16-1.4.07-2.698.96-3.116 2.56-.418 1.602.106 3.461 1.972 5.478l.17.177 5.45 5.54c.138.14.32.14.457 0l5.45-5.54.172-.177c1.866-2.017 2.39-3.876 1.972-5.478-.418-1.6-1.716-2.49-3.116-2.56z" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.75 21V3h2v18h-2zM18.75 21V8.5h2V21h-2zM13.75 21v-8h2v8h-2zM3.75 21v-3.5h2V21h-2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
    </svg>
  );
}
