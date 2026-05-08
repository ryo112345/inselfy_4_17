"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Interview } from "../types";
import { fetchCompanyInterviews } from "../api";
import { fetchCompanyApplications, type JobApplication } from "@/features/job-application/api";
import { CalendarHeader } from "./CalendarHeader";
import { InterviewBlock } from "./InterviewBlock";
import { InterviewDetailPanel } from "./InterviewDetailPanel";

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(d: Date): boolean {
  return toDateStr(d) === toDateStr(new Date());
}

function getTimePosition(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - START_HOUR) * HOUR_HEIGHT;
}

function getTimeDuration(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hours * HOUR_HEIGHT;
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

type ClickTarget = {
  dayIndex: number;
  startMinutes: number;
  screenX: number;
  screenY: number;
};

export function WeekCalendar() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Interview | null>(null);

  // Application picker state
  const [clickTarget, setClickTarget] = useState<ClickTarget | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const loadInterviews = useCallback(async (start: Date) => {
    setLoading(true);
    try {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const res = await fetchCompanyInterviews(toDateStr(start), toDateStr(end));
      setInterviews(res.interviews ?? []);
    } catch {
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const changeWeek = useCallback((newStart: Date) => {
    setWeekStart(newStart);
    loadInterviews(newStart);
  }, [loadInterviews]);

  const handlePrev = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    changeWeek(prev);
  };

  const handleNext = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    changeWeek(next);
  };

  const handleToday = () => {
    changeWeek(getMonday(new Date()));
  };

  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    loadInterviews(weekStart);
  }

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of interviews) {
      if (iv.status !== "scheduled") continue;
      const dayStr = toDateStr(new Date(iv.startTime));
      const list = map.get(dayStr) ?? [];
      list.push(iv);
      map.set(dayStr, list);
    }
    return map;
  }, [interviews]);

  const nowPosition = useMemo(() => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    if (hours < START_HOUR || hours > END_HOUR) return null;
    return (hours - START_HOUR) * HOUR_HEIGHT;
  }, []);

  const todayIndex = useMemo(() => {
    return weekDays.findIndex(isToday);
  }, [weekDays]);

  // Handle grid click on empty area
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleGridClick = useCallback((e: React.MouseEvent, dayIdx: number) => {
    if (!gridContainerRef.current) return;
    const col = (e.target as HTMLElement).closest("[data-day-col]");
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = yToMinutes(y);
    const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, minutes));

    setClickTarget({
      dayIndex: dayIdx,
      startMinutes: clamped,
      screenX: rect.right + 4,
      screenY: e.clientY,
    });
    setAppSearch("");
    setAppLoading(true);
    fetchCompanyApplications({ limit: 50 })
      .then((res) => {
        setApplications(res.items ?? []);
      })
      .catch(() => setApplications([]))
      .finally(() => setAppLoading(false));
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!clickTarget) return;
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setClickTarget(null);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [clickTarget]);

  // Focus search input when picker opens
  useEffect(() => {
    if (clickTarget && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [clickTarget]);

  const filteredApps = useMemo(() => {
    if (!appSearch) return applications;
    const q = appSearch.toLowerCase();
    return applications.filter(
      (a) =>
        a.candidateName.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q),
    );
  }, [applications, appSearch]);

  const handleSelectApp = (app: JobApplication) => {
    if (!clickTarget) return;
    const date = toDateStr(weekDays[clickTarget.dayIndex]);
    const params = new URLSearchParams({
      applicationId: app.id,
      candidateName: app.candidateName,
      date,
      startMinutes: String(clickTarget.startMinutes),
    });
    setClickTarget(null);
    router.push(`/company/calendar/propose?${params}`);
  };

  // Picker position
  const pickerStyle = useMemo(() => {
    if (!clickTarget) return {};
    const pickerWidth = 288;
    let x = clickTarget.screenX;
    if (x + pickerWidth > window.innerWidth - 8) {
      x = clickTarget.screenX - pickerWidth - 8;
    }
    const y = Math.min(clickTarget.screenY - 40, window.innerHeight - 380);
    return { position: "fixed" as const, left: `${Math.max(8, x)}px`, top: `${Math.max(8, y)}px`, zIndex: 50 };
  }, [clickTarget]);

  return (
    <div className="flex flex-col h-full bg-white">
      <CalendarHeader
        weekStart={weekStart}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="sticky top-0 z-10 grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-white">
            <div className="border-r border-gray-100" />
            {weekDays.map((d, i) => {
              const today = isToday(d);
              return (
                <div
                  key={i}
                  className={`border-r border-gray-100 px-2 py-2 text-center ${today ? "bg-blue-50" : ""}`}
                >
                  <p className="text-xs text-gray-500">{DAY_LABELS[i]}</p>
                  <p className={`text-lg font-semibold ${today ? "text-blue-600" : "text-gray-900"}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div ref={gridContainerRef} className="relative grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Hour labels */}
            <div className="relative">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="border-r border-gray-100 pr-2 text-right"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="relative -top-2 text-xs text-gray-400">
                    {String(START_HOUR + i).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((d, dayIdx) => {
              const dayStr = toDateStr(d);
              const dayInterviews = interviewsByDay.get(dayStr) ?? [];
              const today = isToday(d);

              return (
                <div
                  key={dayIdx}
                  data-day-col
                  className={`relative border-r border-gray-100 cursor-pointer ${today ? "bg-blue-50/30" : ""}`}
                  style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    handleGridClick(e, dayIdx);
                  }}
                >
                  {/* Hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {todayIndex === dayIdx && nowPosition !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 border-t-2 border-red-400"
                      style={{ top: `${nowPosition}px` }}
                    >
                      <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-400" />
                    </div>
                  )}

                  {/* Interview blocks */}
                  {dayInterviews.map((iv) => (
                    <InterviewBlock
                      key={iv.id}
                      interview={iv}
                      top={getTimePosition(iv.startTime)}
                      height={getTimeDuration(iv.startTime, iv.endTime)}
                      onClick={setSelected}
                    />
                  ))}

                  {/* Click target preview */}
                  {clickTarget && clickTarget.dayIndex === dayIdx && (
                    <div
                      className="absolute left-1 right-1 rounded-lg bg-blue-100 border-2 border-blue-400 border-dashed pointer-events-none z-10"
                      style={{
                        top: `${((clickTarget.startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                        height: `${HOUR_HEIGHT}px`,
                      }}
                    >
                      <p className="text-xs font-medium text-blue-600 px-2 py-1">
                        {formatTime(clickTarget.startMinutes)} – {formatTime(clickTarget.startMinutes + 60)}
                      </p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interview detail modal */}
      {selected && (
        <InterviewDetailPanel
          interview={selected}
          onClose={() => setSelected(null)}
          onCancelled={() => {
            setSelected(null);
            loadInterviews(weekStart);
          }}
        />
      )}

      {/* Application picker popover */}
      {clickTarget && (
        <div ref={pickerRef} style={pickerStyle} className="w-72 rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">候補者を選択</p>
            <p className="text-[11px] text-gray-400 mb-2">
              {toDateStr(weekDays[clickTarget.dayIndex])} {formatTime(clickTarget.startMinutes)}〜
            </p>
            <input
              ref={searchInputRef}
              type="text"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="名前・求人で検索..."
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {appLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            ) : filteredApps.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">該当する応募がありません</p>
            ) : (
              filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleSelectApp(app)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    {app.candidateName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.candidateName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{app.jobTitle}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
