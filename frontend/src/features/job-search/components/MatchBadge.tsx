function matchScoreColor(score: number): string {
  if (score >= 80) return "#149470";
  if (score >= 55) return "#10b77f";
  if (score >= 30) return "#8aa3d6";
  return "#cfd0cd";
}

export function MatchBadge({ label, value }: { label: string; value: number }) {
  const color = matchScoreColor(value);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {value}%
      </span>
      <div className="w-12 h-[6px] rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function SparklesIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

export function BookmarkOutlineIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
