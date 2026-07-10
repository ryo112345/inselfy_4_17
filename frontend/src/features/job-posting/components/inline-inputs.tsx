"use client";

import { useState } from "react";
import { ACCENT } from "@/constants/theme";

/* ── 求人フォーム共通のインライン編集部品 ── */

export function InlineInput({
  value,
  placeholder,
  onChange,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[${ACCENT}] transition-colors placeholder:text-gray-300 ${className}`}
    />
  );
}

export function InlineTextarea({
  value,
  placeholder,
  onChange,
  rows = 3,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-transparent outline-none border border-transparent rounded-lg hover:border-gray-300 focus:border-[${ACCENT}] transition-colors resize-y placeholder:text-gray-300 ${className}`}
    />
  );
}

export function InlineSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-full truncate bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand transition-colors cursor-pointer text-inherit font-inherit"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function InlineTagInput({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 親管理で重複し得る文字列タグの編集リスト。id なし
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="hover:text-red-500 cursor-pointer ml-0.5"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ タグ追加"
        className="text-sm outline-none bg-transparent text-gray-400 placeholder:text-gray-300 min-w-[80px] py-1"
      />
    </div>
  );
}

export function BenefitTagInput({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 親管理で重複し得る文字列タグの編集リスト。id なし
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-base font-medium"
          style={{
            borderColor: `${ACCENT}40`,
            backgroundColor: `${ACCENT}12`,
            color: ACCENT,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="hover:opacity-60 cursor-pointer ml-0.5"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ 追加"
        className="text-base outline-none bg-transparent placeholder:text-gray-300 min-w-[80px] py-1"
        style={{ color: ACCENT }}
      />
    </div>
  );
}

export function EditableHighlightCard({
  label,
  title,
  onTitleChange,
  titlePlaceholder,
  value,
  onChange,
  icon,
  tone,
  placeholder,
}: {
  label: string;
  title: string;
  onTitleChange: (v: string) => void;
  titlePlaceholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  tone: { bg: string; ring: string; fg: string };
  placeholder: string;
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
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={titlePlaceholder}
        className="text-lg font-bold leading-snug text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand transition-colors"
      />
      <InlineTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="text-[15px] leading-relaxed text-gray-700"
      />
    </div>
  );
}

export function EditableConditionGroup({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    type?: "text" | "textarea" | "select";
    options?: { value: string; label: string }[];
    readOnly?: boolean;
  }[];
  icon: React.ReactNode;
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
            <dd>
              {r.readOnly ? (
                <span className="text-[15px] leading-relaxed text-gray-400">
                  {r.value || r.placeholder}
                </span>
              ) : r.type === "select" && r.options ? (
                <InlineSelect
                  value={r.value}
                  options={r.options}
                  onChange={r.onChange}
                  placeholder="選択"
                />
              ) : r.type === "textarea" ? (
                <InlineTextarea
                  value={r.value}
                  onChange={r.onChange}
                  placeholder={r.placeholder}
                  rows={2}
                  className="text-[15px] leading-relaxed text-gray-900"
                />
              ) : (
                <InlineInput
                  value={r.value}
                  onChange={r.onChange}
                  placeholder={r.placeholder}
                  className="text-[15px] leading-relaxed text-gray-900"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
