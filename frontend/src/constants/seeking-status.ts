// 求職ステータス（jobSeekingStatus）のラベル・カラー定義（F10）。
// バッジ表示は src/components/ui/JobSeekingBadge.tsx を使う。
export const SEEKING_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: "スカウト歓迎",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  open: {
    label: "いい話があれば",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  not_seeking: {
    label: "スカウト不要",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-300",
  },
};
