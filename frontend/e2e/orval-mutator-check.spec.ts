import { expect, test } from "@playwright/test";
import {
  bypassLoginCompany,
  bypassLoginUser,
  INSELFY_COMPANY_ID,
  RINA_TAKAHASHI_USER_ID,
} from "./helpers";

// orval mutator プロトタイプ（Phase 2 評価ゲート）の実挙動検証。
// 検証ページ /dev/orval-check とともに、ゲート判定後は削除してよい。

test("未ログイン: skip 付きフックは 401 がエラーに乗るだけでリダイレクトしない", async ({
  page,
}) => {
  await page.goto("/dev/orval-check");

  // SSR 側: Cookie 無しの転送 → 401 が ApiError として捕捉されている
  await expect(page.getByTestId("ssr-result")).toHaveText(/SSR_ERR:/);

  // クライアント側: skipAuthRedirect 付きの生成フック → 401 でも /login に飛ばない
  // （dev サーバは hydration 中に一時的に要素が重複するため filter で対象を絞る）
  await expect(page.getByTestId("hook-result").filter({ hasText: "HOOK_ERR:" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe("/dev/orval-check");
});

test("未ログイン: skip なし呼び出しは refresh 失敗後 /login にリダイレクトする", async ({
  page,
}) => {
  await page.goto("/dev/orval-check");
  await page.getByTestId("no-skip-button").click();
  await page.waitForURL(/\/login/);
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("企業ログイン中: SSR Cookie 転送で企業名がサーバレンダリングされ、フックも成功する", async ({
  page,
}) => {
  await bypassLoginCompany(page.request, INSELFY_COMPANY_ID);
  await page.goto("/dev/orval-check");

  // SSR: mutator が閲覧者 Cookie をバックエンドへ転送し、企業名が HTML に焼かれている
  await expect(page.getByTestId("ssr-result")).toHaveText(/SSR_OK: .+/);

  // クライアント: 認証付きフックが成功して未読数を返す
  await expect(page.getByTestId("hook-result").filter({ hasText: /HOOK_OK: \d+/ })).toBeVisible();
});

// 注意: refresh はサーバ側で RevokeByUserID（そのユーザーの全 refresh トークン失効）を伴う
// ローテーションのため、このテストを同一ユーザーで並列多重実行（--repeat-each 等）すると
// 互いのトークンを失効させ合って落ちる。多重実行するときは --workers=1 で直列にすること。
// （他スペックは bypass-login の有効なアクセストークンを持ち refresh を発火しないため干渉しない）
test("アクセストークン失効+refresh 有効: 401→refresh 成功→リトライで成功し、リダイレクトしない", async ({
  page,
  context,
}) => {
  await bypassLoginUser(page.request, RINA_TAKAHASHI_USER_ID);

  // アクセストークンだけ失効させ、refresh_token は残す
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name === "refresh_token")).toBeTruthy();
  await context.clearCookies({ name: "inselfy_token" });

  await page.goto("/dev/orval-check");
  await page.getByTestId("user-me-button").click();

  // mutator が 401 を検知 → /api/auth/refresh 成功 → 同一リクエストをリトライして成功する
  await expect(
    page.getByTestId("user-me-result").filter({ hasText: /USERME_OK: .+/ }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/dev/orval-check");

  // refresh により新しいアクセストークンが再発行されている
  const after = await context.cookies();
  expect(after.some((c) => c.name === "inselfy_token")).toBeTruthy();
});
