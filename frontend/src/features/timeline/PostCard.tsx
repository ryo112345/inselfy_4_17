"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostItem } from "./api";
import { toggleLike, toggleRepost, createPost } from "./api";
import { useAuth } from "@/features/auth/auth-context";
import { CommentSection } from "./CommentSection";
import { ArticlePreviewCard, extractArticleId, removeArticleUrl } from "./ArticlePreviewCard";

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
        <Link href={`/profile/${post.username}`} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white self-start" style={{ backgroundColor: "var(--accent)" }}>
          {initial}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/profile/${post.username}`} className="font-bold text-[15px] text-gray-900 hover:underline truncate">
              {post.name || post.username}
            </Link>
            <span className="text-[15px] text-gray-400 truncate">
              @{post.username}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-[15px] text-gray-400 whitespace-nowrap">{timeAgo(post.createdAt)}</span>
          </div>
          {(() => {
            const articleId = extractArticleId(post.content);
            const displayContent = articleId ? removeArticleUrl(post.content) : post.content;
            return (
              <>
                {displayContent && (
                  <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                    {displayContent}
                  </p>
                )}
                {articleId && <ArticlePreviewCard articleId={articleId} />}
              </>
            );
          })()}
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
            <div className="relative flex-1" ref={menuRef}>
              <button
                onClick={handleRepostButtonClick}
                className={`group flex items-center transition-colors ${reposted ? "text-green-600" : "text-gray-400"}`}
              >
                <span className="flex items-center rounded-full transition-colors hover:bg-green-50 hover:text-green-600">
                  <span className="relative flex items-center justify-center w-9 h-9">
                    <span
                      className={repostAnimating ? "repost-icon-pop" : ""}
                      onAnimationEnd={() => setRepostAnimating(false)}
                    >
                      <RetweetIcon />
                    </span>
                    {repostAnimating && <span className="repost-ring" />}
                  </span>
                  {repostCount > 0 && <span className="text-[13px] -ml-1.5 pr-2">{repostCount}</span>}
                </span>
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
              className={`group flex-1 flex items-center transition-colors ${liked ? "text-[#F91880]" : "text-gray-400"}`}
            >
              <span className="flex items-center rounded-full transition-colors hover:bg-[#F918800d] hover:text-[#F91880]">
                <span className="relative flex items-center justify-center w-9 h-9">
                  <span
                    className={likeAnimating ? "like-icon-pop" : ""}
                    onAnimationEnd={() => setLikeAnimating(false)}
                  >
                    {liked ? <LikeIconFilled /> : <LikeIcon />}
                  </span>
                  {/* {likeAnimating && <span className="like-ring" />} */}
                  {likeAnimating && (
                    <>
                      <span className="like-particle" style={{ "--angle": "0deg", "--color": "#FF9999" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "45deg", "--color": "#FFCC99" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "90deg", "--color": "#FFEE99" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "135deg", "--color": "#99EEBB" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "180deg", "--color": "#99DDFF" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "225deg", "--color": "#99BBFF" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "270deg", "--color": "#CC99FF" } as React.CSSProperties} />
                      <span className="like-particle" style={{ "--angle": "315deg", "--color": "#FF99CC" } as React.CSSProperties} />
                    </>
                  )}
                </span>
                {likeCount > 0 && <span className="text-[13px] -ml-1.5 pr-2">{likeCount}</span>}
              </span>
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
      className={`group flex-1 flex items-center transition-colors ${active && activeColor ? activeColor : "text-gray-400"}`}
    >
      <span className={`flex items-center rounded-full transition-colors ${hoverColor}`}>
        <span className="flex items-center justify-center w-9 h-9">
          {icon}
        </span>
        {count !== undefined && count > 0 && <span className="text-[13px] -ml-1.5 pr-2">{count}</span>}
      </span>
    </button>
  );
}

function CommentIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function LikeIconFilled() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
