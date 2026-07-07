"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { selectSlot } from "../api";

type Slot = {
  id: string;
  startTime: string;
  endTime: string;
};

type Props = {
  proposalId: string;
  slots: Slot[];
  message?: string;
  location?: string;
  expiresAt?: string;
  durationMinutes?: number;
  companyName: string;
  jobTitle?: string;
  onConfirmed?: () => void;
};

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 52;
const SNAP_MINUTES = 15;
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(d: Date): boolean {
  return toDateStr(d) === toDateStr(new Date());
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTimeFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${m}/${day}(${weekdays[d.getDay()]})まで`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  if (sm === em) return `${sm}月${sd}日 – ${ed}日`;
  return `${sm}月${sd}日 – ${em}月${ed}日`;
}

type AvailableWindow = {
  slotId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  baseDate: Date;
};

type Selection = {
  slotId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  startIso: string;
  endIso: string;
};

export function CalendarSlotSelector({
  proposalId,
  slots,
  message,
  location,
  expiresAt,
  durationMinutes,
  companyName,
  jobTitle,
  onConfirmed,
}: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  useEffect(() => {
    if (confirmed || isExpired) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.proposalId === proposalId) {
        setCancelled(true);
        onConfirmed?.();
      }
    };
    window.addEventListener("proposal_cancelled", handler);
    return () => window.removeEventListener("proposal_cancelled", handler);
  }, [proposalId, confirmed, isExpired, onConfirmed]);

  const initialWeekStart = useMemo(() => {
    if (slots.length === 0) return getMonday(new Date());
    const earliest = slots.reduce((min, s) =>
      new Date(s.startTime) < new Date(min.startTime) ? s : min,
    );
    return getMonday(new Date(earliest.startTime));
  }, [slots]);

  const [weekStart, setWeekStart] = useState(initialWeekStart);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const allWeeks = useMemo(() => {
    const weeks = new Set<string>();
    for (const slot of slots) {
      const monday = getMonday(new Date(slot.startTime));
      weeks.add(toDateStr(monday));
    }
    return [...weeks].sort();
  }, [slots]);

  const hasMultipleWeeks = allWeeks.length > 1;
  const currentWeekStr = toDateStr(weekStart);
  const currentWeekIdx = allWeeks.indexOf(currentWeekStr);
  const hasPrev = currentWeekIdx > 0;
  const hasNext = currentWeekIdx < allWeeks.length - 1;

  const windows: AvailableWindow[] = useMemo(() => {
    return slots
      .map((slot) => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);
        const dayStr = toDateStr(start);
        const dayIndex = weekDays.findIndex((d) => toDateStr(d) === dayStr);
        return {
          slotId: slot.id,
          dayIndex,
          startMinutes: start.getHours() * 60 + start.getMinutes(),
          endMinutes: end.getHours() * 60 + end.getMinutes(),
          baseDate: start,
        };
      })
      .filter((w) => w.dayIndex >= 0);
  }, [slots, weekDays]);

  const { minHour, maxHour } = useMemo(() => {
    if (windows.length === 0) return { minHour: 9, maxHour: 18 };
    let min = 24;
    let max = 0;
    for (const w of windows) {
      min = Math.min(min, Math.floor(w.startMinutes / 60));
      max = Math.max(max, Math.ceil(w.endMinutes / 60));
    }
    return { minHour: Math.max(START_HOUR, min - 1), maxHour: Math.min(END_HOUR, max + 1) };
  }, [windows]);

  const hours = maxHour - minHour;
  const offsetY = (minutes: number) => ((minutes - minHour * 60) / 60) * HOUR_HEIGHT;

  const handleClick = useCallback(
    (dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (isExpired) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rawMinutes = (y / HOUR_HEIGHT) * 60 + minHour * 60;
      const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
      const endMin = snapped + duration;

      const window = windows.find(
        (w) => w.dayIndex === dayIdx && snapped >= w.startMinutes && endMin <= w.endMinutes,
      );
      if (!window) return;

      const startDate = new Date(window.baseDate);
      startDate.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
      const endDate = new Date(window.baseDate);
      endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      setSelection({
        slotId: window.slotId,
        dayIndex: dayIdx,
        startMinutes: snapped,
        endMinutes: endMin,
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString(),
      });
    },
    [duration, minHour, windows, isExpired],
  );

  const handleConfirm = async () => {
    if (!selection) return;
    setConfirming(true);
    setError(null);
    try {
      await selectSlot(proposalId, selection.slotId, selection.startIso, selection.endIso);
      setConfirmed(true);
      onConfirmed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setConfirming(false);
    }
  };

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="text-sm font-semibold text-green-800">面接日程が確定しました</span>
        </div>
        {selection && (
          <p className="text-sm text-green-700">
            {new Date(selection.startIso).toLocaleDateString("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}{" "}
            {formatTimeFromDate(new Date(selection.startIso))} –{" "}
            {formatTimeFromDate(new Date(selection.endIso))}
          </p>
        )}
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2">
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span className="text-sm font-semibold text-amber-800">この提案は取り消されました</span>
        </div>
        <p className="text-xs text-amber-600 mt-1">
          企業から新しい日程が提案される可能性があります
        </p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm text-gray-500">この提案は期限切れです</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-sm font-semibold">
            {companyName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{companyName}</p>
            {jobTitle && <p className="text-xs text-gray-500">{jobTitle}</p>}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{duration}分</span>
        </div>
        {message && <p className="text-sm text-gray-600">{message}</p>}
        {location && <p className="text-xs text-gray-500 mt-1">場所: {location}</p>}
        <div className="mt-2 space-y-1">
          {slots.map((slot, i) => {
            const s = new Date(slot.startTime);
            const e = new Date(slot.endTime);
            const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
            return (
              <p key={i} className="text-sm font-medium text-gray-900">
                {s.getMonth() + 1}/{s.getDate()}({weekdays[s.getDay()]}) {formatTimeFromDate(s)} –{" "}
                {formatTimeFromDate(e)}
              </p>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">上記の時間帯からカレンダーをクリックして選択</p>
      </div>

      {/* Week header + grid */}
      <div className="px-2">
        <div className="flex items-center justify-center gap-2 py-1.5">
          {hasMultipleWeeks && (
            <button
              onClick={() => hasPrev && setWeekStart(new Date(allWeeks[currentWeekIdx - 1]))}
              disabled={!hasPrev}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-xs font-medium text-gray-500">{formatWeekRange(weekStart)}</span>
          {hasMultipleWeeks && (
            <button
              onClick={() => hasNext && setWeekStart(new Date(allWeeks[currentWeekIdx + 1]))}
              disabled={!hasNext}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[40px_repeat(7,1fr)]">
          <div />
          {weekDays.map((d, i) => {
            const today = isToday(d);
            const hasWindow = windows.some((w) => w.dayIndex === i);
            return (
              <div key={i} className={`py-1 text-center ${today ? "bg-blue-50 rounded-t" : ""}`}>
                <p className="text-[10px] text-gray-500">{DAY_LABELS[d.getDay()]}</p>
                <p
                  className={`text-sm font-semibold ${hasWindow ? "text-blue-600" : today ? "text-blue-500" : "text-gray-400"}`}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: `${Math.min(hours, 8) * HOUR_HEIGHT + 8}px` }}
        >
          <div
            className="grid grid-cols-[40px_repeat(7,1fr)]"
            style={{ height: `${hours * HOUR_HEIGHT}px` }}
          >
            {/* Hour labels */}
            <div className="relative">
              {Array.from({ length: hours }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-1"
                  style={{ top: `${i * HOUR_HEIGHT - 6}px` }}
                >
                  <span className="text-[10px] text-gray-400">
                    {formatTime((minHour + i) * 60)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((d, dayIdx) => {
              const today = isToday(d);
              const dayWindows = windows.filter((w) => w.dayIndex === dayIdx);
              return (
                <div
                  key={dayIdx}
                  className={`relative border-l border-gray-100 cursor-pointer ${today ? "bg-blue-50/20" : ""}`}
                  onClick={(e) => handleClick(dayIdx, e)}
                >
                  {Array.from({ length: hours }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Available windows */}
                  {dayWindows.map((w, wi) => (
                    <div
                      key={wi}
                      className="absolute left-1 right-1 rounded-md bg-blue-100/60 border border-blue-200/50"
                      style={{
                        top: `${offsetY(w.startMinutes)}px`,
                        height: `${offsetY(w.endMinutes) - offsetY(w.startMinutes)}px`,
                      }}
                    />
                  ))}

                  {/* Selection */}
                  {selection &&
                    selection.dayIndex === dayIdx &&
                    toDateStr(weekDays[dayIdx]) === toDateStr(new Date(selection.startIso)) && (
                      <div
                        className="absolute left-1 right-1 rounded-md bg-brand text-white px-1.5 py-0.5 z-10 shadow-md ring-2 ring-brand ring-offset-1"
                        style={{
                          top: `${offsetY(selection.startMinutes)}px`,
                          height: `${offsetY(selection.endMinutes) - offsetY(selection.startMinutes)}px`,
                        }}
                      >
                        <p className="text-[11px] font-medium leading-tight">
                          {formatTime(selection.startMinutes)} – {formatTime(selection.endMinutes)}
                        </p>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100">
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex items-center justify-between">
          {expiresAt && (
            <p className="text-[11px] text-gray-400">回答期限: {formatExpiry(expiresAt)}</p>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selection || confirming}
            className="ml-auto rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-[#357a60] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {confirming ? "確定中..." : "この日程で確定する"}
          </button>
        </div>
      </div>
    </div>
  );
}
