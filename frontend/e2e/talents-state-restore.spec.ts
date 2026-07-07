import { expect, Page, test } from "@playwright/test";

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill("#email", "admin@inselfy.example.com");
  await page.fill("#password", "test1234");
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

    // Click first profile link
    const firstCard = page.locator('a[href^="/profile/"]').first();
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
    const beforeScroll = await resultText.textContent();

    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    // Wait for the count to update (more items loaded via infinite scroll)
    await expect(resultText).not.toHaveText(beforeScroll!, { timeout: 10000 });
    const afterInfiniteLoad = await resultText.textContent();

    // Scroll down to see the new items
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    // Click a profile link
    const profileLink = page.locator('a[href^="/profile/"]').first();
    await profileLink.click();
    await page.waitForURL(/\/profile\//);
    await page.waitForLoadState("networkidle");

    // Go back
    await page.goBack();
    await page.waitForURL(/\/company\/talents/);
    await page.waitForLoadState("networkidle");

    // Verify loaded count is preserved
    await expect(resultText).toBeVisible({ timeout: 10000 });
    await expect(resultText).toHaveText(afterInfiniteLoad!, { timeout: 10000 });

    // Verify page scroll was restored (should be > 0)
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });

  test("diagnostic tab: selected user + scroll are restored after back", async ({ page }) => {
    await page.goto("/company/talents?tab=diagnostic");
    await page.waitForLoadState("networkidle");

    // Select a team and search (second select is team dropdown; first is mode selector)
    const teamSelect = page.locator("select").nth(1);
    await teamSelect.selectOption({ index: 1 });
    await page.click('button:has-text("マッチング検索")');
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

    // Verify diagnostic tab is still active
    await expect(page).toHaveURL(/tab=diagnostic/);

    // Wait for results to reload and detail to appear
    await expect(detailName).toBeVisible({ timeout: 10000 });
    const restoredName = await detailName.textContent();
    expect(restoredName).toBe(selectedName);
  });
});
