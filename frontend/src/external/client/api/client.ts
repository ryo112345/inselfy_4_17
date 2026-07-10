import { client } from "./generated/client.gen";

const baseUrl =
  typeof window === "undefined" ? (process.env.INTERNAL_API_URL ?? "http://localhost:8081") : "";

// 401 時の /login リダイレクトを per-request でオプトアウトするための擬似ヘッダ。
// 判定は response interceptor（interceptor に渡る request には残っている）で行い、
// バックエンドには送らないよう送信前に除去する。
const SKIP_AUTH_REDIRECT_HEADER = "X-Skip-Auth-Redirect";

// 未読バッジ等のベストエフォート取得用。SDK 呼び出しオプションに spread して使う:
//   candidateScoutsCountCandidateUnreadScouts({ ...skipAuthRedirect })
// 未ログイン時は 401 のまま呼び出し元に返る（/login に飛ばされない）。
export const skipAuthRedirect = {
  headers: { [SKIP_AUTH_REDIRECT_HEADER]: "1" },
} as const;

function stripSkipHeader(request: Request): Request {
  const req = new Request(request, { credentials: "include" });
  req.headers.delete(SKIP_AUTH_REDIRECT_HEADER);
  return req;
}

client.setConfig({
  baseUrl,
  fetch: (request: Request) => fetch(stripSkipHeader(request)),
});

let refreshPromise: Promise<boolean> | null = null;

function refreshToken(): Promise<boolean> {
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

client.interceptors.response.use(async (response, request) => {
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetch(stripSkipHeader(request));
    }
    // /login 自身で発生した 401 でリダイレクトすると無限リロードになるため常に除外する
    if (!request.headers.has(SKIP_AUTH_REDIRECT_HEADER) && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
});

export { client };
