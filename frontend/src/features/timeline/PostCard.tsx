import Link from "next/link";
import type { PostItem } from "./api";

type Props = {
  post: PostItem;
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

export function PostCard({ post }: Props) {
  const initial = post.name ? post.name.charAt(0) : post.username.charAt(0);

  return (
    <article className="border-b border-gray-200/80 px-4 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer">
      <div className="flex gap-3">
        <Link href={`/profile/${post.username}`} className="shrink-0">
          <span className="flex w-10 h-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
            {initial}
          </span>
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
          <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
          <div className="flex items-center gap-0 mt-2 -ml-2 max-w-[425px] justify-between">
            <PostAction icon={<CommentIcon />} hoverColor="hover:bg-blue-50 hover:text-blue-500" />
            <PostAction icon={<RetweetIcon />} hoverColor="hover:bg-green-50 hover:text-green-600" />
            <PostAction icon={<LikeIcon />} hoverColor="hover:bg-rose-50 hover:text-rose-500" />
            <PostAction icon={<ViewIcon />} hoverColor="hover:bg-blue-50 hover:text-blue-500" />
            <PostAction icon={<ShareIcon />} hoverColor="hover:bg-blue-50 hover:text-blue-500" />
          </div>
        </div>
      </div>
    </article>
  );
}

function PostAction({ icon, hoverColor }: { icon: React.ReactNode; hoverColor: string }) {
  return (
    <button className={`flex items-center justify-center w-9 h-9 rounded-full text-gray-400 transition-colors ${hoverColor}`}>
      {icon}
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

function LikeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.807 1.09-.806-1.09c-1.211-1.65-2.668-2.22-3.89-2.16-1.4.07-2.698.96-3.116 2.56-.418 1.602.106 3.461 1.972 5.478l.17.177 5.45 5.54c.138.14.32.14.457 0l5.45-5.54.172-.177c1.866-2.017 2.39-3.876 1.972-5.478-.418-1.6-1.716-2.49-3.116-2.56z" strokeLinecap="round" strokeLinejoin="round" />
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
