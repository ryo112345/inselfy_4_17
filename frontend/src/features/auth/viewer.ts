import "server-only";
import { cookies } from "next/headers";
import { buildCookieHeader } from "@/lib/cookie-header";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

// サーバコンポーネントから閲覧者（ログイン中ユーザー）の username を解決する。
// access token 失効時は refresh を試す。未ログイン・失敗時は null。
export async function getCurrentUsername(): Promise<string | null> {
  try {
    const cookieHeader = buildCookieHeader(await cookies());
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    if (res.ok) {
      const data = await res.json();
      return data.username ?? null;
    }
    const refreshRes = await fetch(`${BACKEND}/api/auth/refresh`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
    });
    if (!refreshRes.ok) return null;
    const data = await refreshRes.json();
    return data.username ?? null;
  } catch {
    return null;
  }
}

// /api/auth/me が引けないときのフォールバックとして username cookie を読む
export function getUsernameFromCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const raw = cookieStore.get("username")?.value;
  return raw ? decodeURIComponent(raw) : null;
}
