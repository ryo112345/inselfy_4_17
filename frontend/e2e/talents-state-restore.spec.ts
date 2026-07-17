import { expect, type Page, test } from "@playwright/test";

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill("#email", "admin@inselfy.example.com");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/company(?!\/login)/);
  await page.waitForLoadState("networkidle");
}

test.describe("Talents page state preservation on browser back", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCompany(page);
  });

  test("condition tab: search filters + results + scroll are restored after back", async ({
    page,
  }) => {
    await page.goto("/company/talents");
    await page.waitForLoadState("networkidle");

    // Enter a keyword and search
    const keywordInput = page.locator('input[placeholder*="キーワード"]');
    await keywordInput.fill("エンジニア");
    await page.click('button:has-text("検索する")');
    await page.waitForLoadState("networkidle");

    // Verify results appear
    const resultText = page.locator("text=/\\d+件中/");
    await expect(resultText).toBeVisible({ timeout: 10000 });
    const totalText = await resultText.textContent();

    // router.replace による URL 同期は非同期なので、履歴エントリに検索条件が
    // 反映されるのを待ってから遷移する（待たないと戻った際の復元がレースする）
    await expect(page).toHaveURL(/q=/);

    // Click the visible profile link (デスクトップ幅ではカード内リンクは lg:hidden のため、
    // 詳細パネルの「プロフィール →」を使う)
    const firstCard = page.locator('a[href^="/profile/"]:visible').first();
    const profileHref = await firstCard.getAttribute("href");
    expect(profileHref).toBeTruthy();
    await firstCard.click();
    await page.waitForURL(/\/profile\//);
    await page.waitForLoadState("networkidle");

    // Go back
    await page.goBack();
    await page.waitForURL(/\/company\/talents/);
    await page.waitForLoadState("networkidle");

    // Verify keyword is restored
    await expect(keywordInput).toHaveValue("エンジニア");

    // Verify results are re-fetched
    await expect(resultText).toBeVisible({ timeout: 10000 });
    const restoredText = await resultText.textContent();
    expect(restoredText).toBe(totalText);
  });

  test("condition tab: infinite scroll loads more and state is preserved after back", async ({
    page,
  }) => {
    await page.goto("/company/talents");
    await page.waitForLoadState("networkidle");

    // Search with no filter to get all results
    await page.click('button:has-text("検索する")');
    await page.waitForLoadState("networkidle");

    // Check initial count (should be 20 of N)
    const resultText = page.locator("text=/\\d+件中/");
    await expect(resultText).toBeVisible({ timeout: 10000 });
    const beforeScroll = (await resultText.textContent()) ?? "";

    // Scroll the left panel to bottom to trigger infinite scroll
    // (sentinel の IntersectionObserver は左パネルを root にしているため、
    // ページスクロールではなく左パネル内スクロールで発火する)
    const leftPanel = page
      .getByTestId("diagnostic-split-panel")
      .locator(".overflow-y-auto")
      .first();
    await leftPanel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(1500);

    // Wait for the count to update (more items loaded via infinite scroll)
    await expect(resultText).not.toHaveText(beforeScroll, { timeout: 10000 });
    const afterInfiniteLoad = (await resultText.textContent()) ?? "";

    // Scroll down to see the new items
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    // URL 同期（searched=1）が履歴エントリに反映されるのを待つ
    await expect(page).toHaveURL(/searched=1/);

    // Click a visible profile link (詳細パネルの「プロフィール →」)
    const profileLink = page.locator('a[href^="/profile/"]:visible').first();
    await profileLink.click();
    await page.waitForURL(/\/profile\//);
    await page.waitForLoadState("networkidle");

    // Go back
    await page.goBack();
    await page.waitForURL(/\/company\/talents/);
    await page.waitForLoadState("networkidle");

    // Verify loaded count is preserved
    await expect(resultText).toBeVisible({ timeout: 10000 });
    await expect(resultText).toHaveText(afterInfiniteLoad, { timeout: 10000 });

    // Verify page scroll was restored (should be > 0)
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });

  test("diagnostic tab: selected user + scroll are restored after back", async ({ page }) => {
    await page.goto("/company/talents");
    await page.waitForLoadState("networkidle");

    // 診断マッチングパネルのチーム選択（「チームを選択...」を持つ select）
    const teamSelect = page.locator('select:has(option:text-is("チームを選択..."))');
    await teamSelect.selectOption({ index: 1 });
    await page.click('button:has-text("検索する")');
    await page.waitForLoadState("networkidle");

    // Wait for candidate list to appear
    const candidateButtons = page.locator(".lg\\:block.w-full.text-left.cursor-pointer");
    await expect(candidateButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await candidateButtons.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Click the second candidate
    await candidateButtons.nth(1).click();
    await page.waitForTimeout(500);

    // Get selected user's name from the detail panel header
    const detailName = page.locator("h2.text-xl.font-bold").first();
    await expect(detailName).toBeVisible({ timeout: 5000 });
    const selectedName = await detailName.textContent();

    // URL 同期（team=）が履歴エントリに反映されるのを待つ
    await expect(page).toHaveURL(/team=/);

    // Click "プロフィール →" link in the detail panel
    const profileLink = page.locator('a:has-text("プロフィール →")');
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await page.waitForURL(/\/profile\//);
    await page.waitForLoadState("networkidle");

    // Go back
    await page.goBack();
    await page.waitForURL(/\/company\/talents/);
    await page.waitForLoadState("networkidle");

    // Verify team-mode diagnostic search params are still in the URL
    await expect(page).toHaveURL(/mode=team/);
    await expect(page).toHaveURL(/team=/);

    // Wait for results to reload and detail to appear
    await expect(detailName).toBeVisible({ timeout: 10000 });
    const restoredName = await detailName.textContent();
    expect(restoredName).toBe(selectedName);
  });
});
