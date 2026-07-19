"use client";

import type { FieldErrors } from "@/lib/form-validation";
import { focusField } from "./useFieldErrors";

// 長いフォーム用の上部エラーサマリー（docs/form-inline-validation-design.md §3-1）。
// 各行はアンカーとして働き、クリックで該当欄へスクロール＆フォーカスする。
// 文言はインライン表示（FieldError）と同一のものを使う。

export function ErrorSummary({
  errors,
  labels = {},
  className = "",
}: {
  errors: FieldErrors;
  labels?: Record<string, string>;
  className?: string;
}) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 px-5 py-4 ${className}`}
    >
      <p className="text-sm font-semibold text-red-700">
        入力内容に{entries.length}件の問題があります
      </p>
      <ul className="mt-2 space-y-1">
        {entries.map(([name, message]) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => focusField(name)}
              className="cursor-pointer text-left text-sm text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              {labels[name] ? `${labels[name]}: ${message}` : message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
