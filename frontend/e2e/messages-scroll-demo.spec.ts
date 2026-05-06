import { test, expect } from "@playwright/test";

const USER_ID = "c0201000-0000-0001-0000-000000000004";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

test("messages scroll demo", async ({ page }) => {
  // Bypass login
  await page.goto("/login");
  const res = await page.request.post(
    `http://localhost:3000/api/admin/users/${USER_ID}/bypass-login`,
    { headers: { "X-Admin-Key": ADMIN_API_KEY } },
  );
  expect(res.ok()).toBeTruthy();

  await page.goto("/messages");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Click the conversation
  const convItem = page.getByText("クラウドソル株式会社").first();
  await expect(convItem).toBeVisible({ timeout: 5000 });
  await convItem.click();
  await page.waitForTimeout(1500);

  // Slowly scroll down in the message area
  const messageArea = page.locator(".bg-\\[\\#C8E8F5\\]");
  await expect(messageArea).toBeVisible();

  const box = await messageArea.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(400);
    }
  }

  // Pause here so user can inspect the browser
  await page.pause();
});
