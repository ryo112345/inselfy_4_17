import { expect, type Page, test } from "@playwright/test";

// フォームエラーのインライン表示 Phase B（docs/form-inline-validation-design.md §4）:
// 求人新規作成フォームで文字数超過 → インラインエラー＋サマリー表示 → 修正で消滅。
// 保存は成功させない（開発DBに求人を作らない）。

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill("#email", "admin@inselfy.example.com");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/company(?!\/login)/);
  await page.waitForLoadState("networkidle");
}

test("job form shows inline errors with summary anchors and clears on edit", async ({ page }) => {
  await loginAsCompany(page);
  await page.goto("/company/jobs/new");
  await page.waitForLoadState("networkidle");

  // タイトル（max 200）と就業場所の変更範囲（max 255）を超過させる
  const title = page.locator("#title");
  await title.fill("あ".repeat(201));
  const scope = page.locator("#workLocationChangeScope");
  await scope.fill("い".repeat(256));

  await page.locator('button:has-text("下書き保存")').first().click();

  // インラインエラー（両方）と aria 属性
  await expect(page.locator("#title-error")).toHaveText("200文字以内で入力してください");
  await expect(page.locator("#workLocationChangeScope-error")).toHaveText(
    "255文字以内で入力してください",
  );
  await expect(title).toHaveAttribute("aria-invalid", "true");

  // サマリーには2件、アンカーで該当欄へフォーカス移動できる
  const summary = page.locator('div[role="alert"]', { hasText: "2件の問題があります" });
  await expect(summary).toBeVisible();
  await summary.getByRole("button", { name: /就業場所の変更範囲/ }).click();
  await expect(scope).toBeFocused();

  // 編集した欄のエラーだけ消える
  await scope.fill("当面なし");
  await expect(page.locator("#workLocationChangeScope-error")).toHaveCount(0);
  await expect(page.locator("#title-error")).toBeVisible();

  await title.fill("バックエンドエンジニア");
  await expect(page.locator("#title-error")).toHaveCount(0);
  await expect(summary).toHaveCount(0);
});
