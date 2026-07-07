"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchScoutDashboard } from "@/features/scout/api";
import type { ScoutDashboard } from "@/features/scout/types";

const accent = "#2979ff";
const num = { fontFamily: "var(--font-plus-jakarta-sans)" };

function formatMonth(iso: string) {
  const m = parseInt(iso.split("-")[1], 10);
  return `${m}月`;
}

function formatReplenishDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function ScoutSection() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ScoutDashboard | null>(null);

  useEffect(() => {
    fetchScoutDashboard()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <section className="col-span-3">
        <div className="flex items-center gap-1.5 text-gray-500">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <p className="text-sm font-semibold">スカウト状況</p>
        </div>
        <div className="mt-3 h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />
      </section>
    );
  }

  const totalCredits = data.credits.balance + data.pending.total;
  const balancePct = totalCredits > 0 ? Math.round((data.credits.balance / totalCredits) * 100) : 0;

  return (
    <section className="col-span-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-gray-500"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <p className="text-sm font-semibold">スカウト状況</p>
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
          </svg>
        </button>
        <Link
          href="/company/scout"
          className="text-xs font-medium hover:underline"
          style={{ color: accent }}
        >
          スカウト管理 →
        </Link>
      </div>
      <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-6 pt-3 shadow-sm">
        <div className="mb-3 grid grid-cols-2 gap-6">
          <div>
            <p className="text-base font-semibold text-gray-700">送信可能</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: accent, ...num }}>
                {data.credits.balance}
              </span>
              <span className="text-sm font-normal text-gray-400">
                / <span style={num}>{totalCredits}</span> 通
              </span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${balancePct}%`, backgroundColor: accent }}
              />
            </div>
            {open && (
              <>
                <p className="mt-2 text-sm text-gray-400">
                  補充: {formatReplenishDate(data.credits.nextReplenishDate)}（+
                  {Math.min(
                    data.credits.monthlyAllowance,
                    data.credits.maxStock - data.credits.balance,
                  )}
                  通 / 上限{data.credits.maxStock}通）
                </p>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2.5 text-base font-semibold text-gray-700">
                    スカウト成果（直近90日）
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">スカウト経由応募</span>
                      <span className="font-medium text-gray-700">
                        <span className="text-lg font-bold" style={num}>
                          —
                        </span>{" "}
                        件
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">応募あたり送信数</span>
                      <span className="font-medium text-gray-700">
                        <span className="text-lg font-bold" style={num}>
                          —
                        </span>{" "}
                        通/件
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">返信率</span>
                      <span className="font-medium text-gray-700">
                        <span className="text-lg font-bold" style={num}>
                          {data.replyRate}
                        </span>{" "}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700">返信待ち</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900" style={num}>
                {data.pending.total}
              </span>
              <span className="text-sm font-normal text-gray-400">通</span>
            </div>
            {open && (
              <>
                <div className="mt-2.5 space-y-2">
                  {data.pending.byMonth.map((m) => (
                    <div key={m.month} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{formatMonth(m.month)}送信分</span>
                      <span className="flex items-baseline">
                        <span
                          className="inline-flex items-baseline justify-end font-medium text-gray-700"
                          style={{ width: "3.5rem" }}
                        >
                          <span className="text-lg font-bold" style={num}>
                            {m.count}
                          </span>
                          <span className="ml-1">通</span>
                        </span>
                        <span
                          className={`inline-flex items-baseline justify-end ${m.daysLeft <= 14 ? "font-semibold text-red-500" : "text-gray-400"}`}
                          style={{ width: "4.5rem" }}
                        >
                          残
                          <span className="ml-1.5 text-lg font-bold" style={num}>
                            {m.daysLeft}
                          </span>{" "}
                          日
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">平均返信日数</span>
              <span className="font-medium text-gray-700">
                <span className="text-lg font-bold" style={num}>
                  {data.avgReplyDays}
                </span>{" "}
                日
              </span>
            </div>
            {open && (
              <Link
                href="/company/scout?status=pending"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/5 px-5 py-2 text-sm font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
                </svg>
                返信待ちスカウト一覧を見る
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
