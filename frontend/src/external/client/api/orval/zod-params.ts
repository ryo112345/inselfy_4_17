import type { $ZodRawIssue } from "zod/v4/core";

// orval の override.zod.params から参照されるフォーム検証エラーの日本語化モジュール。
// 生成された各バリデータの末尾引数に `zodParams({...})` 呼び出しが埋め込まれ、
// スキーマ構築時（モジュールロード時）に一度ずつ評価される。返した { error } は
// Zod 4 のスキーマレベル error map として働き、undefined を返すと Zod 既定の
// メッセージにフォールバックする。文言の変更に再生成は不要。

// orval が生成コードに埋め込むコンテキスト（orval の ZodParamsContext と同形。
// frontend は orval に依存しないためここで自前定義する）
export type ZodParamsContext = {
  operationId: string;
  location: "param" | "query" | "header" | "body" | "response" | "schema";
  schemaName: string;
  fieldPath: string[];
  validator: string;
};

// pattern（regex）は正規表現をそのまま見せても伝わらないため、フィールド名で文言を持つ
const PATTERN_MESSAGES: Record<string, string> = {
  username: "3〜20文字の半角英数字とアンダースコアで入力してください",
  profileColor: "#RRGGBB 形式のカラーコードで入力してください",
  candidateId: "ID の形式が正しくありません",
};

function messageFor(issue: $ZodRawIssue, ctx: ZodParamsContext): string | undefined {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined ? "必須項目です" : undefined;
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.origin === "string") {
        return min === 1 ? "入力してください" : `${min}文字以上で入力してください`;
      }
      if (issue.origin === "array") return `${min}件以上入力してください`;
      return `${min}以上の値を入力してください`;
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.origin === "string") return `${max}文字以内で入力してください`;
      if (issue.origin === "array") return `${max}件以内で入力してください`;
      return `${max}以下の値を入力してください`;
    }
    case "invalid_format": {
      if (issue.format === "regex") {
        const field = ctx.fieldPath.at(-1) ?? "";
        return PATTERN_MESSAGES[field] ?? "形式が正しくありません";
      }
      if (issue.format === "email") return "メールアドレスの形式で入力してください";
      if (issue.format === "url") return "URL の形式で入力してください";
      return "形式が正しくありません";
    }
    default:
      return undefined;
  }
}

export const zodParams = (ctx: ZodParamsContext) => ({
  error: (issue: $ZodRawIssue) => messageFor(issue, ctx),
});
