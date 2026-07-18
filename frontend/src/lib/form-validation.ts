import type { ZodType } from "zod";

// 送信前のフォーム入力検証（データ取得層ロードマップ Phase 4）。
// スキーマは orval が OpenAPI から生成した Zod スキーマ（external/client/api/orval/
// generated/zod/**）を使うこと。手書き Zod スキーマは TypeSpec との二重管理になるため
// 書かない。日本語メッセージは zod-params.ts が注入する。

/** フィールド名 → 最初のエラーメッセージ */
export type FieldErrors = Record<string, string>;

/**
 * 生成 Zod スキーマで検証し、エラーがあればフィールド単位のメッセージ辞書を返す。
 * ネストしたエラー（配列要素など）は先頭のトップレベルフィールドに集約する。
 */
export function validateForm(schema: ZodType, data: unknown): FieldErrors | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/**
 * FieldErrors を「ラベル: メッセージ」の表示用文字列配列にする。
 * ラベル未定義のフィールドはフィールド名をそのまま使う。
 */
export function formatFieldErrors(
  errors: FieldErrors,
  labels: Record<string, string> = {},
): string[] {
  return Object.entries(errors).map(([field, message]) => {
    const label = labels[field] ?? field;
    return label ? `${label}: ${message}` : message;
  });
}
