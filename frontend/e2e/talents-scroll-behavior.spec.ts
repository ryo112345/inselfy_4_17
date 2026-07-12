import { expect, type Locator, type Page, test } from "@playwright/test";

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("boundingBox() が null を返した（要素が非表示の可能性）");
  return box;
}

async function loginAsCompany(page: Page) {
  await page.goto("/company/login");
  await page.fill("#email", "admin@inselfy.example.com");
  await page.fill("#password", "test1234");
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
    const panelBox = await boxOf(splitPanel);
    const scrollAmount = panelBox.y;
    await page.evaluate((amount) => window.scrollTo(0, amount), scrollAmount);
    await page.waitForTimeout(300);

    // Header should be hidden
    const headerAfterScroll = await boxOf(header);
    expect(headerAfterScroll.y).toBeLessThan(0);

    // Panel should be at the very top (sticky top-0)
    const panelBoxAfter = await boxOf(splitPanel);
    expect(panelBoxAfter.y).toBeLessThanOrEqual(2);
    expect(panelBoxAfter.y).toBeGreaterThanOrEqual(0);
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
    const box = await boxOf(splitPanel);
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.wheel(0, 150);
    await page.waitForTimeout(300);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });

  test("diagnostic tab: seamless scroll from page to right panel", async ({ page }) => {
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
    const box = await boxOf(splitPanel);
    const rightPanelX = box.x + box.width * 0.75;
    const rightPanelY = box.y + box.height / 2;
    await page.mouse.move(rightPanelX, rightPanelY);

    // Scroll page to make panel sticky first
    const panelBox = await boxOf(splitPanel);
    await page.evaluate((amount) => window.scrollTo(0, amount), panelBox.y);
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

  test("diagnostic tab: scrolling up from right panel seamlessly reveals header", async ({
    page,
  }) => {
    await searchDiagnosticTab(page);

    const firstCandidate = page.locator("ul > li").first();
    await firstCandidate.click();
    await page.waitForTimeout(500);

    const splitPanel = page.getByTestId("diagnostic-split-panel");
    await expect(splitPanel).toBeVisible();

    // Scroll page down to hide header (panel becomes stuck)
    const panelBox = await boxOf(splitPanel);
    await page.evaluate((y) => window.scrollTo(0, y), panelBox.y);
    await page.waitForTimeout(300);
    const stuckScroll = await page.evaluate(() => window.scrollY);
    expect(stuckScroll).toBeGreaterThan(100);

    // Scroll the right panel down so it has scrollTop > 0
    const rightPanel = splitPanel.locator(".overflow-y-auto").nth(1);
    await rightPanel.evaluate((el) => el.scrollTo(0, 300));
    await page.waitForTimeout(200);
    expect(await rightPanel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    // Now wheel up on the right panel — should first scroll panel to top, then reveal header
    const box = await boxOf(splitPanel);
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);

    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -80);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);

    // Right panel should be back at top
    expect(await rightPanel.evaluate((el) => el.scrollTop)).toBe(0);

    // Page should have scrolled up to reveal header
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBeLessThan(stuckScroll);
  });

  test("diagnostic tab: scrolling up from left panel seamlessly reveals header", async ({
    page,
  }) => {
    await searchDiagnosticTab(page);

    const splitPanel = page.getByTestId("diagnostic-split-panel");
    await expect(splitPanel).toBeVisible();

    // Scroll page down to hide header
    const panelBox = await boxOf(splitPanel);
    await page.evaluate((y) => window.scrollTo(0, y), panelBox.y);
    await page.waitForTimeout(300);
    const stuckScroll = await page.evaluate(() => window.scrollY);

    // Scroll left panel down
    const leftPanel = splitPanel.locator(".overflow-y-auto").first();
    await leftPanel.evaluate((el) => el.scrollTo(0, 300));
    await page.waitForTimeout(200);
    expect(await leftPanel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    // Wheel up on left panel
    const box = await boxOf(splitPanel);
    await page.mouse.move(box.x + 100, box.y + box.height / 2);

    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -80);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);

    // Left panel should be back at top
    expect(await leftPanel.evaluate((el) => el.scrollTop)).toBe(0);

    // Page should have scrolled up to reveal header
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBeLessThan(stuckScroll);
  });
});
