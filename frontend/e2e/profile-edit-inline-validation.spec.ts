import { expect, type Page, test } from "@playwright/test";

// フォームエラーのインライン表示（docs/form-inline-validation-design.md §5）:
// 企業プロフィール編集で文字数超過 → インラインエラー表示 → 修正 → エラー消滅 → 保存成功

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill("#email", "admin@inselfy.example.com");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/company(?!\/login)/);
  await page.waitForLoadState("networkidle");
}

test("company profile edit shows inline errors and clears them on edit", async ({ page }) => {
  await loginAsCompany(page);
  await page.goto("/company/profile/edit");
  await page.waitForLoadState("networkidle");

  // 電話番号は maxLength 属性が無いため、zod の上限（30文字）を超えた値を入れられる
  const phone = page.locator("#phoneNumber");
  await expect(phone).toBeVisible();
  const originalPhone = await phone.inputValue();
  await phone.fill("0".repeat(31));

  await page.click('button:has-text("保存する")');

  // インラインエラー + aria 属性
  const inlineError = page.locator("#phoneNumber-error");
  await expect(inlineError).toHaveText("30文字以内で入力してください");
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toHaveAttribute("aria-describedby", "phoneNumber-error");

  // 上部サマリー（同一文言）とアンカーによるフォーカス移動
  const summary = page.locator('div[role="alert"]', { hasText: "1件の問題があります" });
  await expect(summary).toBeVisible();
  await summary.getByRole("button", { name: /電話番号/ }).click();
  await expect(phone).toBeFocused();

  // 編集するとその欄のエラーだけ消える
  await phone.fill(originalPhone || "03-1234-5678");
  await expect(inlineError).toHaveCount(0);
  await expect(summary).toHaveCount(0);
  await expect(phone).not.toHaveAttribute("aria-invalid", "true");

  // 修正後は保存が成功する
  await page.click('button:has-text("保存する")');
  await expect(page.getByText("プロフィールを保存しました")).toBeVisible();

  // 開発DBを汚さないよう元の値に戻す（元から空だった場合のみ再保存）
  if (!originalPhone) {
    await phone.fill("");
    await page.click('button:has-text("保存する")');
    await expect(page.getByText("プロフィールを保存しました")).toBeVisible();
  }
});
