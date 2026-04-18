"use client";

import { useState, type ReactNode } from "react";
import { WorkValuesResultContent } from "@/app/work_values/[sessionId]/page";
import { CareerInterestResultContent } from "@/app/career_interest/[sessionId]/page";

type Props = {
  children: ReactNode;
  username: string;
  wvSessionId: string | null;
  ciSessionId: string | null;
};

export function PanelNavigator({ children, username, wvSessionId, ciSessionId }: Props) {
  const urls = [
    `/profile/${username}`,
    ...(wvSessionId ? [`/work_values/${wvSessionId}`] : []),
    ...(ciSessionId ? [`/career_interest/${ciSessionId}`] : []),
  ];
  const panelCount = urls.length;

  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = (index: number) => {
    if (index < 0 || index >= panelCount) return;
    setActiveIndex(index);
    window.history.replaceState(null, "", urls[index]);
  };

  const panelPx = 672;
  const gapPx = 12;

  return (
    <div className="relative px-4">
      <div
        className="flex transition-transform duration-300 ease-in-out"
        style={{
          gap: `${gapPx}px`,
          transform: `translateX(-${activeIndex * (panelPx + gapPx)}px)`,
        }}
      >
        <div className="shrink-0" style={{ width: `${panelPx}px` }}>{children}</div>

        {wvSessionId && (
          <div className="shrink-0 pt-6 pb-12" style={{ width: `${panelPx}px` }}>
            <WorkValuesResultContent sessionId={wvSessionId} />
          </div>
        )}

        {ciSessionId && (
          <div className="shrink-0 pt-6 pb-12" style={{ width: `${panelPx}px` }}>
            <CareerInterestResultContent sessionId={ciSessionId} />
          </div>
        )}
      </div>

      {panelCount > 1 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1">
          <button
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md cursor-default"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === panelCount - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
