import { test, expect } from "@playwright/test";

test("full navigation: aaa -> aaho -> back -> > button shows diagnostics", async ({
  page,
}) => {
  // 1. Go to profile aaa
  await page.goto("/profile/aaa");
  await page.waitForLoadState("networkidle");

  const nextBtn = page.getByTestId("panel-next");
  await expect(nextBtn).toBeVisible();
  await expect(nextBtn).toBeEnabled();

  // 2. Full navigation to aaho (simulates typing URL in address bar)
  await page.goto("/profile/aaho");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/profile\/aaho/);

  // 3. Browser back — triggers pageshow handler which reloads on back_forward
  await page.goBack();
  // The pageshow handler will reload, so wait for the reload to complete
  await page.waitForURL(/\/profile\/aaa/);
  await page.waitForLoadState("networkidle");
  // Extra wait for potential reload triggered by pageshow handler
  await page.waitForTimeout(3000);
  // After reload, wait for networkidle again
  await page.waitForLoadState("networkidle");

  // 4. Verify React is alive
  const reactAlive = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="panel-next"]');
    if (!el) return false;
    return Object.keys(el).some(k => k.startsWith("__reactFiber") || k.startsWith("__reactProps"));
  });
  expect(reactAlive).toBe(true);

  // 5. Click > to go to diagnostic panel
  const nextBtnAfterBack = page.getByTestId("panel-next");
  await expect(nextBtnAfterBack).toBeVisible({ timeout: 5000 });
  await expect(nextBtnAfterBack).toBeEnabled();
  await nextBtnAfterBack.click();

  // 6. Verify WV diagnostic content loads
  await expect(page.getByText("AI キャリアレポート").first()).toBeVisible({
    timeout: 10000,
  });

  await expect(page).toHaveURL(/\/work_values\//);
});
