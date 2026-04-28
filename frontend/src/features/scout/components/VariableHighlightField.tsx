"use client";

import { useRef, type ReactNode } from "react";

const VARIABLE_SPLIT = /(\{\{[^}]+\}\})/g;
const VARIABLE_TEST = /^\{\{[^}]+\}\}$/;

function renderHighlighted(text: string): ReactNode[] {
  return text.split(VARIABLE_SPLIT).map((part, i) =>
    VARIABLE_TEST.test(part) ? (
      <span key={i} className="text-blue-600 bg-blue-100 px-1 py-0.5 rounded text-xs">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function HighlightInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      {value && (
        <div
          aria-hidden
          className={`absolute inset-0 pointer-events-none border border-transparent rounded-lg px-3 py-2 text-sm ${className}`}
        >
          {renderHighlighted(value)}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={value ? { color: "transparent", caretColor: "#111827" } : undefined}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-transparent relative ${className}`}
      />
    </div>
  );
}

export function HighlightTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="relative">
      {value && (
        <div
          ref={backdropRef}
          aria-hidden
          className={`absolute inset-0 pointer-events-none border border-transparent rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words overflow-hidden ${className}`}
        >
          {renderHighlighted(value)}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        style={value ? { color: "transparent", caretColor: "#111827" } : undefined}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] text-sm resize-y outline-none bg-transparent relative ${className}`}
      />
    </div>
  );
}
