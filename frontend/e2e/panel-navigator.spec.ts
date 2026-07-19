import { expect, test } from "@playwright/test";
import { bypassLoginUser, RINA_TAKAHASHI_USER_ID } from "./helpers";

test("full navigation: rina_fujita -> taro_yamada -> back -> > button shows diagnostics", async ({
  page,
}) => {
  // 診断結果の閲覧はログイン必須（認可ポリシー）のため、閲覧者としてログインする
  await bypassLoginUser(page.request, RINA_TAKAHASHI_USER_ID);

  // 1. Go to profile rina_fujita（WV診断完了済みのシードユーザー）
  await page.goto("/profile/rina_fujita");
  await page.waitForLoadState("networkidle");

  const nextBtn = page.getByTestId("panel-next");
  await expect(nextBtn).toBeVisible();
  await expect(nextBtn).toBeEnabled();

  // 2. Full navigation to taro_yamada (simulates typing URL in address bar)
  await page.goto("/profile/taro_yamada");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/profile\/taro_yamada/);

  // 3. Browser back — triggers pageshow handler which reloads on back_forward
  await page.goBack();
  // The pageshow handler will reload, so wait for the reload to complete
  await page.waitForURL(/\/profile\/rina_fujita/);
  await page.waitForLoadState("networkidle");
  // Extra wait for potential reload triggered by pageshow handler
  await page.waitForTimeout(3000);
  // After reload, wait for networkidle again
  await page.waitForLoadState("networkidle");

  // 4. Verify React is alive
  const reactAlive = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="panel-next"]');
    if (!el) return false;
    return Object.keys(el).some(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps"),
    );
  });
  expect(reactAlive).toBe(true);

  // 5. Click > twice to go to the WV diagnostic panel
  //    （パネル順: プロフィール → 統合レポート → Work Values → Career Interest）
  const nextBtnAfterBack = page.getByTestId("panel-next");
  await expect(nextBtnAfterBack).toBeVisible({ timeout: 5000 });
  await expect(nextBtnAfterBack).toBeEnabled();
  await nextBtnAfterBack.click();
  await page.waitForTimeout(800);
  await nextBtnAfterBack.click();

  // 6. Verify WV diagnostic content loads
  await expect(page.getByText("AI キャリアレポート").first()).toBeVisible({
    timeout: 10000,
  });

  await expect(page).toHaveURL(/\/work_values\//);
});
