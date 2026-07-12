"use client";

import { type ReactNode, useState } from "react";

interface Props {
  color: string;
  onClick: () => void;
  children: ReactNode;
}

export function DashedButton({ color, onClick, children }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative mt-4 block w-full rounded-xl bg-white bg-clip-padding py-5 text-center text-lg font-semibold leading-relaxed transition-colors"
      style={{ color }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <rect
          x={1}
          y={1}
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={12}
          ry={12}
          fill={hovered ? color : "none"}
          fillOpacity={hovered ? 0.06 : 0}
          stroke={hovered ? color : "#d6d9de"}
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
          style={{ transition: "stroke 0.15s, fill 0.15s, fill-opacity 0.15s" }}
        />
      </svg>
      <span className="relative">{children}</span>
    </button>
  );
}
