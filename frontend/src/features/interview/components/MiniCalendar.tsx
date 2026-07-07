"use client";

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MiniCalendar({
  month,
  onMonthChange,
  weekStart,
  onDateClick,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  weekStart: Date;
  onDateClick: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const todayStr = toDateStr(new Date());

  const firstDay = new Date(year, mon, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const weekEndDate = addDays(weekStart, 6);
  const weekStartStr = toDateStr(weekStart);
  const weekEndStr = toDateStr(weekEndDate);

  const cells: Date[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(new Date(year, mon, 1 - startOffset + i));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, mon, i));
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push(new Date(year, mon, daysInMonth + i));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">
          {year}年 {mon + 1}月
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
          <div key={label} className="text-center text-[10px] text-gray-400 py-1">
            {label}
          </div>
        ))}
        {cells.map((date, i) => {
          const dateStr = toDateStr(date);
          const isCurrentMonth = date.getMonth() === mon;
          const isInWeek = dateStr >= weekStartStr && dateStr <= weekEndStr;
          const isTodayDate = dateStr === todayStr;
          return (
            <button
              key={i}
              onClick={() => onDateClick(date)}
              className={`h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-full transition-colors ${
                isTodayDate
                  ? "bg-blue-600 text-white font-semibold"
                  : isInWeek
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : isCurrentMonth
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
