"use client";

import Link from "next/link";
import { useState } from "react";

const actionItems = [
  {
    label: "未対応の応募",
    count: 3,
    urgency: "high",
    href: "/company/applications?status=new",
    description: "48時間以上未対応が1件",
  },
  {
    label: "未返信メッセージ",
    count: 2,
    urgency: "medium",
    href: "/company/messages?filter=unread",
    description: "最新: 田中様より (3時間前)",
  },
  {
    label: "選考結果の入力待ち",
    count: 4,
    urgency: "medium",
    href: "/company/applications?status=pending_result",
    description: "面談後3日以上が2件",
  },
  {
    label: "面接日程の確認待ち",
    count: 1,
    urgency: "low",
    href: "/company/applications?status=scheduling",
    description: "佐藤様 — 候補日回答済み",
  },
  {
    label: "期限切れ間近の求人",
    count: 2,
    urgency: "medium",
    href: "/company/jobs?filter=expiring",
    description: "7日以内に掲載終了が2件",
  },
];

const urgencyColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

export function ActionItemsSection() {
  const [open, setOpen] = useState(false);
  const visible = open ? actionItems : actionItems.slice(0, 2);

  return (
    <section className="col-span-2 flex flex-col">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-gray-500"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="2"
              y="6"
              width="15"
              height="15"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M7 14l3 3L22 5" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <p className="text-sm font-semibold">要対応</p>
          <svg
            aria-hidden="true"
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
      </div>
      <div className="mt-3 flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {visible.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between px-4 py-[10.5px] transition-colors hover:bg-gray-50${i > 0 ? " border-t border-gray-100" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${urgencyColors[item.urgency]}`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            </div>
            <span className="ml-2 text-lg font-bold text-gray-900">{item.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
