import type { ReactNode } from "react";
import { ACCENT } from "@/constants/theme";

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
