"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { timeAgo } from "@/lib/date";
import type { SearchArticleItem, SearchJobItem, SearchPostItem, SearchUserItem } from "./api";

/** キーワードに一致した箇所を <mark> でハイライトする。 */
export function highlight(text: string, keyword: string): ReactNode {
  const kw = keyword.trim();
  if (!kw) return text;
  const lower = text.toLowerCase();
  const kwLower = kw.toLowerCase();
  const parts: ReactNode[] = [];
  let pos = 0;
  while (pos < text.length) {
    const idx = lower.indexOf(kwLower, pos);
    if (idx === -1) {
      parts.push(text.slice(pos));
      break;
    }
    if (idx > pos) parts.push(text.slice(pos, idx));
    parts.push(
      <mark key={idx} className="bg-amber-100 text-inherit rounded-sm">
        {text.slice(idx, idx + kw.length)}
      </mark>,
    );
    pos = idx + kw.length;
  }
  return parts;
}

function AvatarCircle({
  name,
  avatarUrl,
  profileColor,
}: {
  name: string;
  avatarUrl?: string;
  profileColor?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        className="shrink-0 w-10 h-10 rounded-full object-cover self-start"
      />
    );
  }
  return (
    <div
      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white self-start"
      style={{ backgroundColor: profileColor || "var(--accent)" }}
    >
      {name.charAt(0)}
    </div>
  );
}

export function UserResultCard({ user, keyword }: { user: SearchUserItem; keyword: string }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex gap-3 px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors"
    >
      <AvatarCircle name={user.name} avatarUrl={user.avatarUrl} profileColor={user.profileColor} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-bold text-[15px] text-gray-900 truncate">
            {highlight(user.name, keyword)}
          </span>
          <span className="text-[13px] text-gray-400 truncate">
            @{highlight(user.username, keyword)}
          </span>
        </div>
        {user.headline && (
          <p className="text-[13px] text-gray-500 truncate">{highlight(user.headline, keyword)}</p>
        )}
      </div>
    </Link>
  );
}

export function ArticleResultCard({
  article,
  keyword,
}: {
  article: SearchArticleItem;
  keyword: string;
}) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="block px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors"
    >
      <div className="flex items-center gap-2 text-[13px] text-gray-400">
        <span className="truncate">{article.authorName}</span>
        <span className="text-gray-300">·</span>
        <span className="whitespace-nowrap">{timeAgo(article.publishedAt)}</span>
        {article.isPaid && (
          <span className="ml-auto shrink-0 text-[11px] font-semibold text-amber-600 border border-amber-300 rounded-full px-2 py-0.5">
            有料
          </span>
        )}
      </div>
      <p className="mt-0.5 font-bold text-[15px] text-gray-900 line-clamp-2">
        {highlight(article.title, keyword)}
      </p>
      <p className="mt-0.5 text-[13px] text-gray-500 line-clamp-2">
        {highlight(article.excerpt.replace(/[#>*`\-|]/g, "").trim(), keyword)}
      </p>
      {article.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
            >
              {highlight(tag, keyword)}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function PostResultCard({ post, keyword }: { post: SearchPostItem; keyword: string }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className="flex gap-3 px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors"
    >
      <AvatarCircle name={post.name || post.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-bold text-[15px] text-gray-900 truncate">
            {post.name || post.username}
          </span>
          <span className="text-[13px] text-gray-400 truncate">@{post.username}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[13px] text-gray-400 whitespace-nowrap">
            {timeAgo(post.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[14px] text-gray-900 whitespace-pre-wrap break-words line-clamp-3">
          {highlight(post.content, keyword)}
        </p>
      </div>
    </Link>
  );
}

export function JobResultCard({ job, keyword }: { job: SearchJobItem; keyword: string }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex gap-3 px-4 py-3 border-b border-gray-200/80 hover:bg-gray-50/60 transition-colors"
    >
      {job.companyLogoUrl ? (
        <Image
          src={job.companyLogoUrl}
          alt=""
          width={40}
          height={40}
          className="shrink-0 w-10 h-10 rounded-lg object-cover border border-gray-200 self-start"
        />
      ) : (
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center self-start">
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
          >
            <rect x="3" y="7" width="18" height="14" rx="2" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] text-gray-900 line-clamp-2">
          {highlight(job.title, keyword)}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-gray-500">
          {job.companyName && <span className="truncate">{job.companyName}</span>}
          {job.employmentType && (
            <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {job.employmentType}
            </span>
          )}
          {job.location && <span className="truncate">{job.location}</span>}
        </div>
      </div>
    </Link>
  );
}
