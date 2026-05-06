# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: messages-scroll-demo.spec.ts >> messages scroll demo
- Location: e2e/messages-scroll-demo.spec.ts:6:5

# Error details

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const USER_ID = "c0201000-0000-0001-0000-000000000004";
  4  | const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";
  5  | 
  6  | test("messages scroll demo", async ({ page }) => {
  7  |   // Bypass login
  8  |   await page.goto("/login");
  9  |   const res = await page.request.post(
  10 |     `http://localhost:3000/api/admin/users/${USER_ID}/bypass-login`,
  11 |     { headers: { "X-Admin-Key": ADMIN_API_KEY } },
  12 |   );
  13 |   expect(res.ok()).toBeTruthy();
  14 | 
  15 |   await page.goto("/messages");
  16 |   await page.waitForLoadState("networkidle");
  17 |   await page.waitForTimeout(1000);
  18 | 
  19 |   // Click the conversation
  20 |   const convItem = page.getByText("クラウドソル株式会社").first();
  21 |   await expect(convItem).toBeVisible({ timeout: 5000 });
  22 |   await convItem.click();
> 23 |   await page.waitForTimeout(1500);
     |              ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  24 | 
  25 |   // Slowly scroll down in the message area
  26 |   const messageArea = page.locator(".bg-\\[\\#C8E8F5\\]");
  27 |   await expect(messageArea).toBeVisible();
  28 | 
  29 |   const box = await messageArea.boundingBox();
  30 |   if (box) {
  31 |     await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  32 |     for (let i = 0; i < 20; i++) {
  33 |       await page.mouse.wheel(0, 60);
  34 |       await page.waitForTimeout(400);
  35 |     }
  36 |   }
  37 | 
  38 |   // Pause here so user can inspect the browser
  39 |   await page.pause();
  40 | });
  41 | 
```