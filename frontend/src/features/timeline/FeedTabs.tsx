"use client";

import { useState } from "react";

const tabs = [
  { id: "for-you", label: "おすすめ" },
  { id: "following", label: "フォロー中" },
];

export function FeedTabs() {
  const [active, setActive] = useState("for-you");

  return (
    <div className="flex border-b border-gray-200/80">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`flex-1 py-3.5 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
            active === tab.id
              ? "text-gray-900"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] rounded-full bg-[var(--accent)]" />
          )}
        </button>
      ))}
    </div>
  );
}
