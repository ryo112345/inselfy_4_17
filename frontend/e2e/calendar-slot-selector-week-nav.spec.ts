import { expect, test } from "@playwright/test";
import {
  bypassLoginCompany,
  bypassLoginUser,
  ensureApplication,
  futureSlot,
  INSELFY_COMPANY_ID,
  JOB_POSTING_FOR_CALENDAR_SPEC,
  proposeInterview,
  RINA_TAKAHASHI_USER_ID,
} from "./helpers";

test("selected slot in messages should not appear on different week", async ({
  page,
  playwright,
}) => {
  // --- Setup: 応募を保証し、企業から今週の候補枠つき提案を作成する ---
  await bypassLoginUser(page.request, RINA_TAKAHASHI_USER_ID);
  const applicationId = await ensureApplication(page.request, JOB_POSTING_FOR_CALENDAR_SPEC);

  const companyRequest = await playwright.request.newContext();
  await bypassLoginCompany(companyRequest, INSELFY_COMPANY_ID);
  // 週送り矢印は候補枠が複数週にまたがる場合のみ描画されるため、
  // 2日後と9日後（必ず別週になる7日差）の2枠を提案する
  await proposeInterview(companyRequest, applicationId, "週ナビゲーション検証用の提案", [
    futureSlot(2),
    futureSlot(9),
  ]);
  await companyRequest.dispose();

  await page.goto("/messages");
  await page.waitForLoadState("networkidle");

  // Click on inselfy conversation
  const convItem = page.locator("button", { hasText: "inselfy" }).first();
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

    // Navigate to next week
    await nextArrow.click();
    await page.waitForTimeout(1000);

    // The selection should NOT be visible on the next week
    await expect(selection).not.toBeVisible({ timeout: 3000 });

    found = true;
    break;
  }

  expect(found).toBeTruthy();
});
