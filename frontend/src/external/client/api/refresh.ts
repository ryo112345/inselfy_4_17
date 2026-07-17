// 401 時のトークン再発行（ブラウザ専用）。in-flight の refresh を単一化する。
//
// refresh トークンはサーバ側でローテーションされ、使用済みトークンでの再 refresh は
// 401 + Cookie 全消去（clearedAuthCookies）で応答される。そのため hey-api クライアント
// （client.ts）と orval mutator（orval/custom-fetch.ts）が別々の単一飛行を持つと、
// 同時 401 のとき負けた側の旧トークン再利用 401 が勝った側の新トークンを消してしまう。
// 移行期間中に両クライアントが共存する間は、必ずこのモジュールを共有すること。
let refreshPromise: Promise<boolean> | null = null;

export function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
