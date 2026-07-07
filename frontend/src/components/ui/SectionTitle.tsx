import type { ReactNode } from "react";

// TODO(F10): ACCENT はテーマカラー定数化の際に var(--color-brand) へ置き換える
const ACCENT = "#3D8B6E";

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          {icon}
        </span>
      )}
      <h2 className="text-xl font-bold tracking-tight text-gray-900">{children}</h2>
    </div>
  );
}
