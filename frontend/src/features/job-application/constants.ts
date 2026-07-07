import type { JobApplicationStatus } from "./api";

export const STATUS_LABELS: Record<string, string> = {
  applied: "応募受付",
  screening: "書類選考",
  interview: "面接",
  offer: "内定",
  accepted: "内定承諾",
  rejected: "不合格",
  withdrawn: "辞退",
};

export const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-50 text-blue-700",
  screening: "bg-amber-50 text-amber-700",
  interview: "bg-purple-50 text-purple-700",
  offer: "bg-emerald-50 text-emerald-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

export const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: "applied", label: "応募受付" },
  { value: "screening", label: "書類選考" },
  { value: "interview", label: "面接" },
  { value: "offer", label: "内定" },
  { value: "accepted", label: "内定承諾" },
  { value: "rejected", label: "不合格" },
];

export const FILTER_TABS = [
  { value: "", label: "すべて" },
  { value: "applied", label: "応募受付" },
  { value: "screening", label: "書類選考" },
  { value: "interview", label: "面接" },
  { value: "offer", label: "内定" },
  { value: "accepted", label: "内定承諾" },
  { value: "rejected", label: "不合格" },
  { value: "withdrawn", label: "辞退" },
];

export type DatePreset = "" | "today" | "week" | "month" | "3months";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "", label: "全期間" },
  { value: "today", label: "今日" },
  { value: "week", label: "直近1週間" },
  { value: "month", label: "直近1ヶ月" },
  { value: "3months", label: "直近3ヶ月" },
];

export function datePresetToRange(preset: DatePreset): { from?: string; to?: string } {
  if (!preset) return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let from: Date;
  switch (preset) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3months":
      from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function daysAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "今日";
  if (d === 1) return "昨日";
  return `${d}日前`;
}
