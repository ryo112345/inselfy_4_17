import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto("https://www.felmat.net/publisher/login");

await page.screenshot({ path: "/tmp/felmat_login_page.png", fullPage: true });

const loginInput = await page.locator('input[name="login_id"], input[type="text"]').first();
await loginInput.fill("akiyamaryo715");
await page.fill('input[type="password"]', "Akiyamaryo715");

await Promise.all([
  page.waitForURL((url) => !url.href.includes("login"), { timeout: 15000 }).catch(() => {}),
  page.click('button[type="submit"], input[type="submit"]'),
]);

await page.waitForTimeout(3000);

const url = page.url();
console.log("ログイン後URL:", url);

if (url.includes("login")) {
  console.log("ログイン失敗の可能性があります");
} else {
  console.log("ログイン成功！");
}

await page.screenshot({ path: "/tmp/felmat_after_login.png", fullPage: true });
console.log("スクリーンショット保存: /tmp/felmat_after_login.png");

await page.goto("https://www.felmat.net/publisher/ad/data#view");
await page.waitForTimeout(3000);

await page.screenshot({ path: "/tmp/felmat_data_page.png", fullPage: true });
console.log("データページスクショ保存: /tmp/felmat_data_page.png");

await browser.close();
