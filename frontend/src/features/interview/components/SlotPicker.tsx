"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldError, fieldAriaProps } from "@/components/form/FieldError";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { CompanyInterviewsProposeInterviewBody } from "@/external/client/api/orval/generated/zod/interviews/interviews.zod";
import { checkPendingProposal, proposeInterview } from "../api";
import { MiniCalendar } from "./MiniCalendar";

type SlotEntry = {
  id: string;
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
};

type Props = {
  applicationId: string;
  candidateName: string;
  initialDate?: string;
  initialStartMinutes?: number;
};

const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getSunday(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
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

function minutesToY(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function yToMinutes(y: number): number {
  const raw = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
  return Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  if (sm === em) return `${sy}年${sm}月${sd}日 – ${ed}日`;
  return `${sy}年${sm}月${sd}日 – ${em}月${ed}日`;
}

let slotIdCounter = 0;

const DURATION_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const minutes = (i + 1) * 15;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 && m > 0 ? `${h}時間${m}分` : h > 0 ? `${h}時間` : `${m}分`;
  return { label, value: minutes };
});

export function SlotPicker({
  applicationId,
  candidateName,
  initialDate,
  initialStartMinutes,
}: Props) {
  const router = useRouter();
  const [duration, setDuration] = useState(60);
  const [weekStart, setWeekStart] = useState(() => {
    if (initialDate) return getSunday(new Date(initialDate));
    const today = new Date();
    const sunday = getSunday(today);
    if (today.getDay() >= 5) return addDays(sunday, 7);
    return sunday;
  });
  const [slots, setSlots] = useState<SlotEntry[]>(() => {
    if (initialDate && initialStartMinutes != null) {
      const target = new Date(initialDate);
      const endMinutes = Math.min(initialStartMinutes + 60, END_HOUR * 60);
      return [
        {
          id: `slot-${++slotIdCounter}`,
          dateStr: toDateStr(target),
          startMinutes: initialStartMinutes,
          endMinutes,
        },
      ];
    }
    return [];
  });
  const [message, _setMessage] = useState("以下の日程でご都合の良い日時をお選びください。");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, validate, clearField } = useFieldErrors();
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    checkPendingProposal(applicationId)
      .then((res) => setHasPending(res.hasPending))
      .catch(() => {});
  }, [applicationId]);

  // 候補枠を編集したら件数上限（slots）のエラーを消す
  useEffect(() => {
    if (slots.length > 0) clearField("slots");
  }, [slots, clearField]);

  const dragRef = useRef<{ dayIndex: number; startMinutes: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    dayIndex: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const [miniCalMonth, setMiniCalMonth] = useState(
    () => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1),
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekDaysRef = useRef(weekDays);
  weekDaysRef.current = weekDays;

  const handleMiniCalDateClick = useCallback((date: Date) => {
    setWeekStart(getSunday(date));
  }, []);

  const getDayAndMinutes = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const dayWidth = rect.width / 7;
    const dayIndex = Math.max(0, Math.min(6, Math.floor(x / dayWidth)));
    const minutes = yToMinutes(y);
    const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, minutes));
    return { dayIndex, minutes: clamped };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const pos = getDayAndMinutes(e);
      if (!pos) return;
      const endMinutes = Math.min(pos.minutes + duration, END_HOUR * 60);
      dragRef.current = { dayIndex: pos.dayIndex, startMinutes: pos.minutes };
      setDragPreview({ dayIndex: pos.dayIndex, startMinutes: pos.minutes, endMinutes });
      e.preventDefault();
    },
    [getDayAndMinutes, duration],
  );

  const dragMovedRef = useRef(false);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const lastMouseY = useRef(0);

  useEffect(() => {
    const EDGE_ZONE = 60;
    const MAX_SPEED = 12;

    const doAutoScroll = () => {
      const container = scrollContainerRef.current;
      if (!container || !dragRef.current) return;
      const rect = container.getBoundingClientRect();
      const y = lastMouseY.current;
      let speed = 0;
      if (y > rect.bottom - EDGE_ZONE) {
        speed = Math.min(MAX_SPEED, ((y - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE) * MAX_SPEED);
      } else if (y < rect.top + EDGE_ZONE) {
        speed = -Math.min(MAX_SPEED, ((rect.top + EDGE_ZONE - y) / EDGE_ZONE) * MAX_SPEED);
      }
      if (speed !== 0) {
        container.scrollTop += speed;
      }
      autoScrollRef.current = requestAnimationFrame(doAutoScroll);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !gridRef.current) return;
      dragMovedRef.current = true;
      lastMouseY.current = e.clientY;
      const rect = gridRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top + gridRef.current.scrollTop;
      let endMinutes = yToMinutes(y);
      endMinutes = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, endMinutes));
      const start = dragRef.current.startMinutes;
      if (endMinutes <= start) {
        setDragPreview({
          dayIndex: dragRef.current.dayIndex,
          startMinutes: endMinutes,
          endMinutes: start,
        });
      } else {
        setDragPreview({ dayIndex: dragRef.current.dayIndex, startMinutes: start, endMinutes });
      }
      if (autoScrollRef.current === null) {
        autoScrollRef.current = requestAnimationFrame(doAutoScroll);
      }
    };

    const handleMouseUp = () => {
      stopAutoScroll();
      if (!dragRef.current) return;
      const { dayIndex, startMinutes: start } = dragRef.current;
      const dateStr = toDateStr(weekDaysRef.current[dayIndex]);
      if (!dragMovedRef.current) {
        const end = Math.min(start + duration, END_HOUR * 60);
        if (end > start) {
          setSlots((prev) => [
            ...prev,
            { id: `slot-${++slotIdCounter}`, dateStr, startMinutes: start, endMinutes: end },
          ]);
        }
      } else if (dragPreview && dragPreview.endMinutes > dragPreview.startMinutes) {
        if (dragPreview.endMinutes - dragPreview.startMinutes >= SNAP_MINUTES) {
          const dragDateStr = toDateStr(weekDaysRef.current[dragPreview.dayIndex]);
          setSlots((prev) => [
            ...prev,
            {
              id: `slot-${++slotIdCounter}`,
              dateStr: dragDateStr,
              startMinutes: dragPreview.startMinutes,
              endMinutes: dragPreview.endMinutes,
            },
          ]);
        }
      }
      dragRef.current = null;
      dragMovedRef.current = false;
      setDragPreview(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      stopAutoScroll();
    };
  }, [dragPreview, duration, stopAutoScroll]);

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async () => {
    if (slots.length === 0) {
      setError("候補日時を1つ以上選択してください");
      return;
    }
    setError(null);
    const apiSlots = slots.map((s) => {
      const day = new Date(`${s.dateStr}T00:00:00`);
      const startDate = new Date(day);
      startDate.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
      const endDate = new Date(day);
      endDate.setHours(Math.floor(s.endMinutes / 60), s.endMinutes % 60, 0, 0);
      return { startTime: startDate.toISOString(), endTime: endDate.toISOString() };
    });
    const body = {
      applicationId,
      message,
      location: location || undefined,
      durationMinutes: duration,
      slots: apiSlots,
    };
    if (!validate(CompanyInterviewsProposeInterviewBody, body)) return;
    setSubmitting(true);
    try {
      await proposeInterview(body);
      router.push("/company/calendar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg
              aria-hidden="true"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {hasPending ? "面接日程を再提案" : "面接日程を提案"}
            </h1>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{candidateName}</span> さんに候補日時を
              {hasPending ? "再" : ""}提案
            </p>
            {hasPending && (
              <p className="text-xs text-amber-600 mt-0.5">
                前回の提案は自動的にキャンセルされます
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {fieldErrors.slots && <p className="text-sm text-red-600">{fieldErrors.slots}</p>}
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || slots.length === 0}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "送信中..."
              : hasPending
                ? `日程を再提案する（${slots.length}件）`
                : `日程を提案する（${slots.length}件）`}
          </button>
        </div>
      </div>

      {/* Toolbar: week nav + duration + message/location */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            >
              <svg
                aria-hidden="true"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            >
              <svg
                aria-hidden="true"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="slot-duration" className="text-xs text-gray-500">
              面談時間
            </label>
            <select
              id="slot-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="location" className="text-xs text-gray-500">
              場所
            </label>
            <div>
              <input
                {...fieldAriaProps("location", fieldErrors.location)}
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearField("location");
                }}
                placeholder="Zoom / オフィス住所"
                className="w-48 rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 aria-invalid:border-red-400 aria-invalid:bg-red-50/60"
              />
              <FieldError name="location" error={fieldErrors.location} />
            </div>
          </div>
          <span className="text-xs text-gray-400">
            空いている時間帯をドラッグしてください。候補者はその中から
            {duration >= 60 ? `${Math.floor(duration / 60)}時間` : ""}
            {duration % 60 > 0 ? `${duration % 60}分` : ""}を選びます
          </span>
        </div>
      </div>

      {/* Main content: mini calendar + week grid */}
      <div className="flex flex-1 min-h-0">
        {/* Mini Calendar */}
        <div className="w-56 shrink-0 border-r border-gray-100 px-4 pt-4">
          <MiniCalendar
            month={miniCalMonth}
            onMonthChange={setMiniCalMonth}
            weekStart={weekStart}
            onDateClick={handleMiniCalDateClick}
          />
        </div>

        {/* Week calendar */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Day Headers */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 shrink-0">
            <div />
            {weekDays.map((d, i) => {
              const today = isToday(d);
              return (
                <div
                  key={d.getTime()}
                  className={`py-2 text-center border-l border-gray-100 ${today ? "bg-blue-50" : ""}`}
                >
                  <p className="text-[11px] text-gray-500">{DAY_LABELS[i]}</p>
                  <p
                    className={`text-lg font-semibold ${today ? "text-blue-600" : "text-gray-900"}`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {/* Hour labels column */}
              <div>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: 固定時間グリッドの罫線・ラベル。index が時刻の同一性そのもので並び替え・挿入なし
                    key={i}
                    className="relative border-r border-gray-100"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <span className="absolute -top-2.5 right-2 text-[11px] text-gray-400">
                      {formatTime((START_HOUR + i) * 60)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: マウス座標から時間帯を計算するドラッグ専用グリッド。キーボードでは操作できない補助UI */}
              <div
                ref={gridRef}
                className="col-span-7 grid grid-cols-7 relative select-none cursor-crosshair"
                onMouseDown={handleMouseDown}
                style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
              >
                {weekDays.map((d, dayIdx) => {
                  const today = isToday(d);
                  const dayStr = toDateStr(d);
                  const daySlots = slots.filter((s) => s.dateStr === dayStr);
                  return (
                    <div
                      key={dayStr}
                      className={`relative border-l border-gray-100 ${today ? "bg-blue-50/30" : ""}`}
                    >
                      {/* Hour lines */}
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: 固定時間グリッドの罫線・ラベル。index が時刻の同一性そのもので並び替え・挿入なし
                          key={i}
                          className="absolute left-0 right-0 border-t border-gray-100"
                          style={{ top: `${i * HOUR_HEIGHT}px` }}
                        />
                      ))}
                      {/* Half-hour lines */}
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: 固定時間グリッドの罫線・ラベル。index が時刻の同一性そのもので並び替え・挿入なし
                          key={`half-${i}`}
                          className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                          style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                        />
                      ))}

                      {/* Created slots */}
                      {daySlots.map((slot) => (
                        <button
                          type="button"
                          key={slot.id}
                          aria-label={`${formatTime(slot.startMinutes)}–${formatTime(slot.endMinutes)} の枠を削除`}
                          className="absolute left-1 right-1 rounded-lg bg-blue-500 text-white px-2 py-1 text-left cursor-pointer hover:bg-blue-600 transition-colors group z-10"
                          style={{
                            top: `${minutesToY(slot.startMinutes)}px`,
                            height: `${minutesToY(slot.endMinutes) - minutesToY(slot.startMinutes)}px`,
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(slot.id);
                          }}
                        >
                          <p className="text-xs font-medium leading-tight truncate">
                            {formatTime(slot.startMinutes)} – {formatTime(slot.endMinutes)}
                          </p>
                          {minutesToY(slot.endMinutes) - minutesToY(slot.startMinutes) >= 48 && (
                            <p className="text-[11px] opacity-70 mt-0.5">クリックで削除</p>
                          )}
                          <span className="absolute top-1 right-1.5 text-white/60 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            ✕
                          </span>
                        </button>
                      ))}

                      {/* Drag preview */}
                      {dragPreview && dragPreview.dayIndex === dayIdx && (
                        <div
                          className="absolute left-1 right-1 rounded-lg bg-blue-500 text-white z-20 pointer-events-none"
                          style={{
                            top: `${minutesToY(dragPreview.startMinutes)}px`,
                            height: `${Math.max(minutesToY(dragPreview.endMinutes) - minutesToY(dragPreview.startMinutes), 4)}px`,
                          }}
                        >
                          <p className="text-xs font-medium px-2 py-1">
                            {formatTime(dragPreview.startMinutes)} –{" "}
                            {formatTime(dragPreview.endMinutes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
