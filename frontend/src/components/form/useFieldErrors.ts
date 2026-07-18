"use client";

import { useCallback, useRef, useState } from "react";
import type { ZodType } from "zod";
import { type FieldErrors, validateForm } from "@/lib/form-validation";

// フォームエラーのインライン表示（docs/form-inline-validation-design.md §3-1）。
// 検証は送信時に全件、エラー表示後は編集した欄だけ clearField で消す（再検証はしない）。
// スキーマは必ず orval 生成の Zod（generated/zod/**）を渡すこと。手書き Zod は禁止。

/** 対象フィールドの入力要素へスクロールしてフォーカスする（要素 id = フィールド名） */
export function focusField(name: string) {
  const el = document.getElementById(name);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // validate 直後（state 反映前）に scrollToFirstError から参照するための同期コピー
  const lastErrors = useRef<FieldErrors>({});

  const validate = useCallback((schema: ZodType, data: unknown): boolean => {
    const errors = validateForm(schema, data) ?? {};
    lastErrors.current = errors;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const clearField = useCallback((name: string) => {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      lastErrors.current = next;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    lastErrors.current = {};
    setFieldErrors({});
  }, []);

  const scrollToFirstError = useCallback(() => {
    const names = Object.keys(lastErrors.current);
    if (names.length === 0) return;
    // カンマ区切りセレクタは文書順で最初の一致を返すため、DOM 上で最も上の欄に飛べる
    const el = document.querySelector<HTMLElement>(
      names.map((name) => `#${CSS.escape(name)}`).join(", "),
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, []);

  return { fieldErrors, validate, clearField, clearAll, scrollToFirstError };
}
