import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto("https://www.felmat.net/publisher/login");
const loginInput = await page.locator('input[name="login_id"], input[type="text"]').first();
await loginInput.fill("akiyamaryo715");
await page.fill('input[type="password"]', "Akiyamaryo715");
await Promise.all([
  page.waitForURL((url) => !url.href.includes("login"), { timeout: 15000 }).catch(() => {}),
  page.click('button[type="submit"], input[type="submit"]'),
]);
await page.waitForTimeout(2000);
console.log("ログイン成功:", page.url());

await page.context().storageState({ path: "/tmp/felmat_session.json" });
console.log("セッション保存完了: /tmp/felmat_session.json");

await browser.close();
