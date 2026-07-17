// 401 時のトークン再発行（ブラウザ専用）。in-flight の refresh を領域（realm）ごとに単一化する。
//
// refresh トークンはサーバ側でローテーションされ、使用済みトークンでの再 refresh は
// 401 + Cookie 全消去（clearedAuthCookies）で応答される。そのため hey-api クライアント
// （client.ts）と orval mutator（orval/custom-fetch.ts）が別々の単一飛行を持つと、
// 同時 401 のとき負けた側の旧トークン再利用 401 が勝った側の新トークンを消してしまう。
// 移行期間中に両クライアントが共存する間は、必ずこのモジュールを共有すること。
//
// 候補者（user）と企業（company）は別 Cookie・別エンドポイントの独立セッションなので、
// 単一飛行も領域ごとに分ける。admin はスコープ外（silent refresh なし）。

export type AuthRealm = "user" | "company";

const REFRESH_ENDPOINT: Record<AuthRealm, string> = {
  user: "/api/auth/refresh",
  company: "/api/company/auth/refresh",
};

export const LOGIN_PATH: Record<AuthRealm, string> = {
  user: "/login",
  company: "/company/login",
};

const LOGIN_PATHS = Object.values(LOGIN_PATH);

/** リクエストパスから領域を判定する（`/api/company/` プレフィックス → company）。 */
export function realmForApiPath(path: string): AuthRealm {
  return path.startsWith("/api/company/") ? "company" : "user";
}

/** ログインページ自身での 401 リダイレクトは無限リロードになるため両領域とも除外する。 */
export function isLoginPath(pathname: string): boolean {
  return LOGIN_PATHS.includes(pathname);
}

const refreshPromises: Partial<Record<AuthRealm, Promise<boolean>>> = {};

export function refreshToken(realm: AuthRealm): Promise<boolean> {
  const inFlight = refreshPromises[realm];
  if (inFlight) return inFlight;
  const promise = fetch(REFRESH_ENDPOINT[realm], {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromises[realm] = undefined;
    });
  refreshPromises[realm] = promise;
  return promise;
}
