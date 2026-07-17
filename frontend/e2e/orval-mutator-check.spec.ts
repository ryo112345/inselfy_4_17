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

test("未ログイン: 企業 API の skip なし呼び出しは refresh 失敗後 /company/login にリダイレクトする", async ({
  page,
}) => {
  await page.goto("/dev/orval-check");
  // no-skip-button は companyAuthCompanyGetMe（/api/company/ プレフィックス）を呼ぶため
  // 企業 realm と判定され、企業ログインへ飛ぶ
  await page.getByTestId("no-skip-button").click();
  await page.waitForURL(/\/company\/login/);
  expect(new URL(page.url()).pathname).toBe("/company/login");
});

test("未ログイン: 候補者 API の skip なし呼び出しは refresh 失敗後 /login にリダイレクトする", async ({
  page,
}) => {
  await page.goto("/dev/orval-check");
  await page.getByTestId("user-me-button").click();
  await page.waitForURL(/\/login$/);
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

// refresh のローテーションは per-token（使った1本だけ失効）なので、同一ユーザーで
// 並列多重実行（--repeat-each 等）しても各実行の refresh_token は互いに干渉しない
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

test("企業アクセストークン失効+refresh 有効: 401→企業 refresh 成功→リトライで成功し、リダイレクトしない", async ({
  page,
  context,
}) => {
  await bypassLoginCompany(page.request, INSELFY_COMPANY_ID);

  // アクセストークンだけ失効させ、company_refresh_token は残す
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name === "company_refresh_token")).toBeTruthy();
  await context.clearCookies({ name: "company_token" });

  await page.goto("/dev/orval-check");
  await page.getByTestId("no-skip-button").click();

  // mutator が 401 を検知 → /api/company/auth/refresh 成功 → 同一リクエストをリトライして成功する
  await expect(
    page.getByTestId("no-skip-result").filter({ hasText: /NOSKIP_OK: .+/ }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/dev/orval-check");

  // refresh により新しい企業アクセストークンが再発行されている
  const after = await context.cookies();
  expect(after.some((c) => c.name === "company_token")).toBeTruthy();
});
