"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { selectSlot, fetchProposalSlots } from "../api";

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
};

type Props = {
  proposalId: string;
  slots: Slot[];
  message?: string;
  location?: string;
  expiresAt?: string;
  durationMinutes?: number;
  isCandidate: boolean;
  status?: string;
  onConfirmed?: () => void;
};

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 48;
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

type ConfirmedSlot = { startTime: string; endTime: string };

export function ProposalCard({ proposalId, slots, message, location, expiresAt, durationMinutes, isCandidate, status, onConfirmed }: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(status === "confirmed");
  const [confirmedSlot, setConfirmedSlot] = useState<ConfirmedSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const isPending = !confirmed && !isExpired && status !== "cancelled";
  const canSelect = isCandidate && isPending;

  useEffect(() => {
    if (status === "confirmed" && !confirmedSlot) {
      fetchProposalSlots(proposalId)
        .then((res) => {
          const selected = res.slots?.find(
            (s: { status: string; startTime: string; endTime: string }) => s.status === "selected",
          );
          if (selected) {
            setConfirmedSlot({ startTime: selected.startTime, endTime: selected.endTime });
          }
        })
        .catch(() => {});
    }
  }, [status, proposalId, confirmedSlot]);

  const initialWeekStart = useMemo(() => {
    if (slots.length === 0) return getMonday(new Date());
    const earliest = slots.reduce((min, s) =>
      new Date(s.start_time) < new Date(min.start_time) ? s : min
    );
    return getMonday(new Date(earliest.start_time));
  }, [slots]);

  const [weekStart, setWeekStart] = useState(initialWeekStart);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
  [weekStart]);

  const allWeeks = useMemo(() => {
    const weeks = new Set<string>();
    for (const slot of slots) {
      const monday = getMonday(new Date(slot.start_time));
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
    return slots.map((slot) => {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      const dayStr = toDateStr(start);
      const dayIndex = weekDays.findIndex((d) => toDateStr(d) === dayStr);
      return {
        slotId: slot.id,
        dayIndex,
        startMinutes: start.getHours() * 60 + start.getMinutes(),
        endMinutes: end.getHours() * 60 + end.getMinutes(),
        baseDate: start,
      };
    }).filter((w) => w.dayIndex >= 0);
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

  const handleClick = useCallback((dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!canSelect) return;
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
  }, [canSelect, duration, minHour, windows]);

  const handleConfirm = async () => {
    if (!selection) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await selectSlot(proposalId, selection.slotId, selection.startIso, selection.endIso);
      setConfirmed(true);
      setConfirmedSlot({ startTime: res.interview.startTime, endTime: res.interview.endTime });
      onConfirmed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setConfirming(false);
    }
  };

  if (confirmed) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-green-800">日程が確定しました</span>
        </div>
        {confirmedSlot && (
          <p className="text-sm text-green-700 ml-5">
            {new Date(confirmedSlot.startTime).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
            {" "}{formatTimeFromDate(new Date(confirmedSlot.startTime))} – {formatTimeFromDate(new Date(confirmedSlot.endTime))}
          </p>
        )}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-500">提案期限が過ぎました</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden max-w-md">
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-100">
        <div className="flex items-center gap-2 mb-1">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="text-sm font-semibold text-blue-900">面接日程のご提案</span>
          <span className="text-xs text-gray-500">({duration}分)</span>
        </div>
        {message && <p className="text-sm text-gray-700">{message}</p>}
        {location && <p className="text-xs text-gray-500 mt-1">場所: {location}</p>}
        <div className="mt-2 space-y-1">
          {slots.map((slot, i) => {
            const s = new Date(slot.start_time);
            const e = new Date(slot.end_time);
            const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
            return (
              <p key={i} className="text-sm font-medium text-gray-900">
                {s.getMonth() + 1}/{s.getDate()}({weekdays[s.getDay()]}) {formatTimeFromDate(s)} – {formatTimeFromDate(e)}
              </p>
            );
          })}
        </div>
        {canSelect && (
          <p className="text-xs text-gray-400 mt-2">上記の時間帯からカレンダーをクリックして選択</p>
        )}
      </div>

      {/* Calendar grid */}
      <div className="px-2 bg-white">
        <div className="flex items-center justify-center gap-2 py-1.5">
          {hasMultipleWeeks && (
            <button
              onClick={() => hasPrev && setWeekStart(new Date(allWeeks[currentWeekIdx - 1]))}
              disabled={!hasPrev}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <span className="text-xs font-medium text-gray-500">{formatWeekRange(weekStart)}</span>
          {hasMultipleWeeks && (
            <button
              onClick={() => hasNext && setWeekStart(new Date(allWeeks[currentWeekIdx + 1]))}
              disabled={!hasNext}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[36px_repeat(7,1fr)]">
          <div />
          {weekDays.map((d, i) => {
            const today = isToday(d);
            const hasWindow = windows.some((w) => w.dayIndex === i);
            return (
              <div key={i} className={`py-1 text-center ${today ? "bg-blue-50 rounded-t" : ""}`}>
                <p className="text-[10px] text-gray-500">{DAY_LABELS[d.getDay()]}</p>
                <p className={`text-xs font-semibold ${hasWindow ? "text-blue-600" : today ? "text-blue-500" : "text-gray-400"}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: `${Math.min(hours, 6) * HOUR_HEIGHT + 8}px` }}>
          <div className="grid grid-cols-[36px_repeat(7,1fr)]" style={{ height: `${hours * HOUR_HEIGHT}px` }}>
            {/* Hour labels */}
            <div className="relative">
              {Array.from({ length: hours }, (_, i) => (
                <div key={i} className="absolute right-1" style={{ top: `${i * HOUR_HEIGHT - 5}px` }}>
                  <span className="text-[9px] text-gray-400">
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
                  className={`relative border-l border-gray-100 ${today ? "bg-blue-50/20" : ""} ${canSelect ? "cursor-pointer" : ""}`}
                  onClick={(e) => handleClick(dayIdx, e)}
                >
                  {Array.from({ length: hours }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Available windows (light blue background) */}
                  {dayWindows.map((w, wi) => (
                    <div
                      key={wi}
                      className="absolute left-0.5 right-0.5 rounded-md bg-blue-100/60 border border-blue-200/50"
                      style={{
                        top: `${offsetY(w.startMinutes)}px`,
                        height: `${offsetY(w.endMinutes) - offsetY(w.startMinutes)}px`,
                      }}
                    />
                  ))}

                  {/* Selected slot */}
                  {selection && selection.dayIndex === dayIdx && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded-md bg-blue-600 text-white px-1.5 py-0.5 z-10 shadow-md ring-2 ring-blue-600 ring-offset-1"
                      style={{
                        top: `${offsetY(selection.startMinutes)}px`,
                        height: `${offsetY(selection.endMinutes) - offsetY(selection.startMinutes)}px`,
                      }}
                    >
                      <p className="text-[10px] font-medium leading-tight">
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
      <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/50">
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex items-center justify-between">
          {expiresAt && isPending && (
            <p className="text-[11px] text-gray-400">回答期限: {formatExpiry(expiresAt)}</p>
          )}
          {canSelect && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selection || confirming}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {confirming ? "確定中..." : "この日程で確定する"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
