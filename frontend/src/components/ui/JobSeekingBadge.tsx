import { SEEKING_STATUS_MAP } from "@/constants/seeking-status";

type Props = {
  status: string | null | undefined;
  /** xs: 候補者カード用 / sm: プロフィールヘッダー用 */
  size?: "xs" | "sm";
  dot?: boolean;
};

export function JobSeekingBadge({ status, size = "xs", dot = true }: Props) {
  const cfg = status ? SEEKING_STATUS_MAP[status] : null;
  if (!cfg) return null;
  const sizeClass = size === "sm" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${cfg.bg} ${cfg.text}`}
    >
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}
