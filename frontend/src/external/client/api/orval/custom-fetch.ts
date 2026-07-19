// orval 生成クライアント用の custom mutator。
// hey-api 時代の client.ts（baseUrl 切替・credentials・401→refresh→リダイレクト）
// + server.ts（SSR Cookie 転送）+ run()（非2xx → ApiError throw）を1関数に統合したもの。
// 生成コード（generated/）はすべての HTTP 呼び出しでこの customFetch を経由する。
import { unwrap } from "../../../../lib/api-result";
import { isLoginPath, LOGIN_PATH, realmForApiPath, refreshToken } from "../refresh";

const baseUrl =
  typeof window === "undefined" ? (process.env.INTERNAL_API_URL ?? "http://localhost:8081") : "";

// 401 時の /login リダイレクトを per-request でオプトアウトするための擬似ヘッダ。
// 生成関数の第2引数（RequestInit）に spread して使う:
//   useMessagesUnreadCount({ request: skipAuthRedirect })
// バックエンドには送らないよう送信前に除去する。
const SKIP_AUTH_REDIRECT_HEADER = "X-Skip-Auth-Redirect";

export const skipAuthRedirect = {
  headers: { [SKIP_AUTH_REDIRECT_HEADER]: "1" },
} as const;

// SSR（サーバコンポーネント）からの呼び出しに閲覧者の Cookie を転送するためのプロバイダ。
// next/headers はクライアントバンドルに含められないため、この module では import せず、
// server.ts（"server-only"）が setSsrCookieProvider で注入する（現行 server.ts の
// interceptor 登録と同じ「page.tsx で一度 import する」使い方）。
type SsrCookieProvider = () => Promise<string>;
let ssrCookieProvider: SsrCookieProvider | null = null;

export function setSsrCookieProvider(provider: SsrCookieProvider): void {
  ssrCookieProvider = provider;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const headers = new Headers(options.headers);
  const skip = headers.has(SKIP_AUTH_REDIRECT_HEADER);
  headers.delete(SKIP_AUTH_REDIRECT_HEADER);

  // SSR: 呼び出し側が明示的に Cookie を渡していなければ閲覧者の Cookie を転送する
  if (typeof window === "undefined" && ssrCookieProvider && !headers.has("Cookie")) {
    try {
      const cookieHeader = await ssrCookieProvider();
      if (cookieHeader) headers.set("Cookie", cookieHeader);
    } catch {
      // リクエストスコープ外（ビルド時プリレンダ等）では転送しない
    }
  }

  const doFetch = () => fetch(`${baseUrl}${url}`, { ...options, headers, credentials: "include" });

  let response = await doFetch();

  if (response.status === 401 && typeof window !== "undefined") {
    // 候補者/企業は別セッションなので、リクエストパスで refresh 先とログイン画面を切り替える
    const realm = realmForApiPath(url);
    const refreshed = await refreshToken(realm);
    if (refreshed) {
      response = await doFetch();
    } else if (!skip && !isLoginPath(window.location.pathname)) {
      // ログインページ自身で発生した 401 でリダイレクトすると無限リロードになるため常に除外する
      window.location.href = LOGIN_PATH[realm];
    }
  }

  const body = await parseBody(response);
  if (!response.ok) throw unwrap(body, `Request failed with status ${response.status}`);
  return body as T;
};

export default customFetch;
