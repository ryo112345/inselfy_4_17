import { test, expect, Page } from "@playwright/test";

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill('#email', "admin@inselfy.example.com");
  await page.fill('#password', "test1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/company(?!\/login)/);
  await page.waitForLoadState("networkidle");
}

async function searchDiagnosticTab(page: Page) {
  await page.goto("/company/talents?tab=diagnostic");
  await page.waitForLoadState("networkidle");

  const teamSelect = page.locator("select").nth(1);
  await teamSelect.selectOption({ index: 1 });

  await page.click('button:has-text("マッチング検索")');
  await page.waitForLoadState("networkidle");

  const candidateList = page.locator("ul > li").first();
  await expect(candidateList).toBeVisible({ timeout: 15000 });
}

test.describe("Talents page scroll behavior", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCompany(page);
  });

  test("diagnostic tab: header scrolls away first, then panels become scrollable", async ({
    page,
  }) => {
    await searchDiagnosticTab(page);

    const firstCandidate = page.locator("ul > li").first();
    await firstCandidate.click();
    await page.waitForTimeout(500);

    const header = page.locator("h1:has-text('人材を探す')");
    await expect(header).toBeVisible();

    const splitPanel = page.getByTestId("diagnostic-split-panel");
    await expect(splitPanel).toBeVisible();

    // Scroll down to hide header and search bar
    const panelBox = await splitPanel.boundingBox();
    const scrollAmount = panelBox!.y;
    await page.evaluate((amount) => window.scrollTo(0, amount), scrollAmount);
    await page.waitForTimeout(300);

    // Header should be hidden
    const headerAfterScroll = await header.boundingBox();
    expect(headerAfterScroll!.y).toBeLessThan(0);

    // Panel should be at the very top (sticky top-0)
    const panelBoxAfter = await splitPanel.boundingBox();
    expect(panelBoxAfter!.y).toBeLessThanOrEqual(2);
    expect(panelBoxAfter!.y).toBeGreaterThanOrEqual(0);
  });

  test("diagnostic tab: wheel on panel scrolls page first when header is visible", async ({
    page,
  }) => {
    await searchDiagnosticTab(page);

    const splitPanel = page.getByTestId("diagnostic-split-panel");
    await expect(splitPanel).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Wheel over the split panel — should scroll the page, not the panel
    const box = await splitPanel.boundingBox();
    await page.mouse.move(box!.x + 100, box!.y + 100);
    await page.mouse.wheel(0, 150);
    await page.waitForTimeout(300);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });

  test("diagnostic tab: seamless scroll from page to right panel", async ({
    page,
  }) => {
    await searchDiagnosticTab(page);

    // Select a candidate to show detail in right panel
    const firstCandidate = page.locator("ul > li").first();
    await firstCandidate.click();
    await page.waitForTimeout(500);

    const splitPanel = page.getByTestId("diagnostic-split-panel");
    await expect(splitPanel).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    // Wheel enough on the right panel area to first hide header, then scroll panel content
    const box = await splitPanel.boundingBox();
    const rightPanelX = box!.x + box!.width * 0.75;
    const rightPanelY = box!.y + box!.height / 2;
    await page.mouse.move(rightPanelX, rightPanelY);

    // Scroll page to make panel sticky first
    const panelBox = await splitPanel.boundingBox();
    await page.evaluate((amount) => window.scrollTo(0, amount), panelBox!.y);
    await page.waitForTimeout(300);

    // Page should have scrolled to hide header
    const pageScroll = await page.evaluate(() => window.scrollY);
    expect(pageScroll).toBeGreaterThan(100);

    // Now scroll within the right panel directly
    const rightPanel = splitPanel.locator(".overflow-y-auto").nth(1);
    await rightPanel.evaluate((el) => el.scrollTo(0, 200));
    await page.waitForTimeout(200);

    // Right panel should be scrollable after panel is stuck
    const rightPanelScroll = await rightPanel.evaluate((el) => el.scrollTop);
    expect(rightPanelScroll).toBeGreaterThan(0);
  });
});
