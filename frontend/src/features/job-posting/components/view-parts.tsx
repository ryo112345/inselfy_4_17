import { ACCENT } from "@/constants/theme";

/* ── 求人詳細（読み取り専用）ページ共通の表示部品 ── */

export const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

export function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{value}</div>
    </div>
  );
}

export function HighlightCard({
  label,
  title,
  body,
  icon,
  tone,
  fallback,
}: {
  label: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: { bg: string; ring: string; fg: string };
  /** body が空のときの表示（プレビューの「未入力」など） */
  fallback?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-3.5 rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: tone.fg }}>
          {label}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-gray-900">{title}</h3>
      <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
        {body || fallback}
      </p>
    </div>
  );
}

export function ConditionGroup({
  title,
  rows,
  icon,
  fallback,
}: {
  title: string;
  rows: { label: string; value: string }[];
  icon: React.ReactNode;
  /** value が空のときの表示（プレビューの「未入力」など） */
  fallback?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
        >
          {icon}
        </span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      <dl className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1">
            <dt className="text-xs font-medium tracking-wide text-gray-500">{r.label}</dt>
            <dd className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
              {r.value || fallback}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
