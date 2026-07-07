import { expect, test } from "@playwright/test";

const USER_ID = "10000000-0000-0000-0000-000000000021"; // 高橋里奈
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

test.use({ launchOptions: { slowMo: 1000 } });

test("selected slot in messages should not appear on different week", async ({ page }) => {
  // Bypass login as 高橋里奈
  const res = await page.request.post(
    `http://localhost:3000/api/admin/users/${USER_ID}/bypass-login`,
    { headers: { "X-Admin-Key": ADMIN_API_KEY } },
  );
  expect(res.ok()).toBeTruthy();

  await page.goto("/messages");
  await page.waitForLoadState("networkidle");

  // Click on クラウドソル株式会社 conversation
  const convItem = page.getByText("クラウドソル株式会社").first();
  await expect(convItem).toBeVisible({ timeout: 10000 });
  await convItem.click();
  await page.waitForTimeout(1500);

  // Find the proposal card that has week navigation
  // Look for the next-week arrow (right chevron)
  const nextArrows = page.locator("button svg path[d='M9 5l7 7-7 7']");
  const count = await nextArrows.count();

  // Find the first proposal card with week nav that allows selection
  let found = false;
  for (let i = 0; i < count; i++) {
    const nextArrow = nextArrows.nth(i).locator("..");
    if (await nextArrow.isDisabled()) continue;

    // Find the proposal card container
    const card = nextArrow.locator("xpath=ancestor::div[contains(@class,'rounded-xl')]").first();

    // Check if this card has "カレンダーをクリックして選択" text (means it's selectable)
    const selectHint = card.getByText("カレンダーをクリックして選択");
    if (!(await selectHint.isVisible().catch(() => false))) continue;

    // Click on an available slot in this card
    const availableWindow = card.locator("[class*='bg-blue-100']").first();
    if (!(await availableWindow.isVisible().catch(() => false))) continue;

    await availableWindow.click();
    await page.waitForTimeout(500);

    // Check if a selection appeared (blue slot with ring)
    const selection = card.locator("[class*='ring-2'][class*='ring-offset-1']");
    if (!(await selection.isVisible().catch(() => false))) continue;

    const selectionText = await selection.textContent();
    expect(selectionText).toBeTruthy();

    await page.waitForTimeout(2000);

    // Navigate to next week
    await nextArrow.click();
    await page.waitForTimeout(2000);

    // The selection should NOT be visible on the next week
    await expect(selection).not.toBeVisible({ timeout: 3000 });

    await page.waitForTimeout(2000);
    found = true;
    break;
  }

  expect(found).toBeTruthy();
});
