"use client";

import { useEffect, useRef, useState } from "react";

export function ExpandableText({ text, maxLines = 6 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text 変更時に行数を再計測するための意図的な依存
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    setNeedsExpansion(el.scrollHeight > lineHeight * maxLines + lineHeight * 0.5);
  }, [text, maxLines]);

  return (
    <div>
      <p
        ref={ref}
        className="whitespace-pre-wrap text-base leading-relaxed text-gray-800"
        style={
          !expanded && needsExpansion
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      {needsExpansion && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 cursor-pointer text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
        >
          {expanded ? "閉じる" : "続きを読む"}
        </button>
      )}
    </div>
  );
}
