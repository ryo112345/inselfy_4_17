import type { cookies } from "next/headers";

// サーバコンポーネントからバックエンドへ認証 Cookie を転送するためのヘッダを組み立てる。
// Next の cookies() は値をデコード済みで返すため、日本語等の非ASCII値（過去に発行していた
// displayName 等、既存ブラウザに残っている可能性がある）をそのまま載せると fetch が
// ByteString 変換エラーで throw する。バックエンドの url.QueryEscape と同様に再エンコードして転送する。
export function buildCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>): string {
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
}
