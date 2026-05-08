"use client";

type Props = {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const ey = end.getFullYear();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  if (sy === ey && sm === em) {
    return `${sy}年${sm}月${sd}日 – ${ed}日`;
  }
  if (sy === ey) {
    return `${sy}年${sm}月${sd}日 – ${em}月${ed}日`;
  }
  return `${sy}年${sm}月${sd}日 – ${ey}年${em}月${ed}日`;
}

export function CalendarHeader({ weekStart, onPrev, onNext, onToday }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="text-lg font-semibold text-gray-900">面接カレンダー</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          今週
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[200px] text-center text-sm font-medium text-gray-700">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
