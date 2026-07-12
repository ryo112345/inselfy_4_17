"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACCENT } from "@/constants/theme";
import type { ModelsSimilarUserItem } from "@/external/client/api/generated";

type Props = {
  // サーバー（page.tsx）で取得した一覧。null はフェッチ失敗
  users: ModelsSimilarUserItem[] | null;
  visible: boolean;
  className?: string;
};

export function SimilarUsersCard({ users, visible, className }: Props) {
  const router = useRouter();
  const error = users === null;

  if (!visible) return null;
  // 0件（エラーなし）はカード自体を出さない。エラー時は0件と区別して表示する。
  if (!error && users.length === 0) return null;

  return (
    <div className={className ?? "w-full max-w-[320px] ml-auto"}>
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)] overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[15px] font-bold text-gray-900">価値観が近い人</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">Work Values の結果から</p>
        </div>

        {error ? (
          <div className="px-5 pb-5 flex items-center gap-2">
            <span className="text-[13px] text-red-600">読み込みに失敗しました</span>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-[13px] text-[var(--accent)] hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(users ?? []).map((u) => (
              <SimilarUserRow key={u.userId} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SimilarUserRow({ user }: { user: ModelsSimilarUserItem }) {
  const color = user.profileColor ?? ACCENT;
  const experiences = user.experiences ?? [];
  const topNeeds = user.topNeeds ?? [];
  const simColor =
    user.similarity >= 80
      ? "text-emerald-600 bg-emerald-50"
      : user.similarity >= 60
        ? "text-blue-600 bg-blue-50"
        : "text-gray-500 bg-gray-100";

  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}18` }}
      >
        <SmallFaceIcon className="h-6 w-6" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-gray-900 truncate group-hover:underline">
            {user.name}
          </span>
          <span className={`shrink-0 text-[13px] font-bold px-1.5 py-0.5 rounded-full ${simColor}`}>
            {user.similarity}%
          </span>
        </div>

        {experiences.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {experiences.map((exp) => (
              <div key={`${exp.companyName}-${exp.title}`} className="flex gap-1.5">
                <span
                  className={`mt-[5px] inline-block w-1.5 h-1.5 rounded-full shrink-0 ${exp.isCurrent ? "bg-emerald-400" : "bg-gray-300"}`}
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-700 leading-tight">
                    {exp.companyName}
                  </p>
                  <p className="text-[12px] text-gray-400 leading-tight">{exp.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {topNeeds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {topNeeds.map((label) => (
              <span
                key={label}
                className="inline-block text-[12px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function SmallFaceIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="10" opacity={0.15} />
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
      <path
        d="M8.5 14.5c0 0 1.5 2 3.5 2s3.5-2 3.5-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
