import "server-only";
import { cookies } from "next/headers";
import { authGetMe } from "@/external/client/api/orval/generated/endpoints/auth/auth";
import { buildCookieHeader } from "@/lib/cookie-header";
import type { AuthUser } from "./auth-context";

// サーバコンポーネントから閲覧者（ログイン中ユーザー）を解決する。未ログイン・失敗時は null。
//
// 注意: ここで refresh は行わない。mutator（custom-fetch.ts）の 401→refresh はブラウザ限定で、
// Server Component は Set-Cookie を返せないため、サーバー側で refresh するとブラウザに残った
// refresh_token だけが失効し、次のクライアント側 refresh が必ず失敗してログアウトに至る。
// access token 失効時は null を返し、クライアント側（auth-context / mutator）に任せる。
// Cookie は明示的に渡す（orval/server の provider に依存せず、Cookie 無しの無駄打ちも避ける）。
export async function getViewer(): Promise<AuthUser | null> {
  try {
    const cookieHeader = buildCookieHeader(await cookies());
    if (!cookieHeader) return null;
    return await authGetMe({ headers: { Cookie: cookieHeader } });
  } catch {
    return null;
  }
}

// 閲覧者の username だけ欲しいページ向け。失効時のフォールバックには
// getUsernameFromCookie を併用する（既存の呼び出し側は全てそうしている）。
export async function getCurrentUsername(): Promise<string | null> {
  return (await getViewer())?.username ?? null;
}

// /api/auth/me が引けないときのフォールバックとして username cookie を読む
export function getUsernameFromCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const raw = cookieStore.get("username")?.value;
  return raw ? decodeURIComponent(raw) : null;
}
