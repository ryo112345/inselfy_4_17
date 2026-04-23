"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function TalentSearchPage() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team");

  return (
    <div className="max-w-4xl mx-auto">
      {teamId && (
        <Link
          href={`/company/teams/${teamId}`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          チームに戻る
        </Link>
      )}

      <div className="mt-8 flex flex-col items-center justify-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <p className="text-lg font-bold text-gray-900 mb-1">人材検索</p>
        <p className="text-sm text-gray-400 mb-6">チームの診断傾向に合う候補者をここに表示予定</p>
        {teamId && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
            チーム ID: {teamId} のWV/CIスコアで絞り込み予定
          </div>
        )}
      </div>
    </div>
  );
}
