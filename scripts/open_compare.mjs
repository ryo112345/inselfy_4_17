import { chromium } from "playwright";

// 開く比較記事（引数で差し替え可）。デフォルトは査定サービスが多数並ぶランキング記事。
const url = process.argv[2] || "https://www.mihama-jutaku.co.jp/articles/magazine/ikkatsu-satei/";

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 60, viewport: { width: 1300, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

console.log("開きます:", url);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3000);
// 全体を描画させるため一度下までスクロールして戻す
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/compare_page.png", fullPage: true });
console.log("OPENED / スクショ: /tmp/compare_page.png");
console.log("このウィンドウは開いたままにします（10分）。");
// ウィンドウを開いたまま保持
await page.waitForTimeout(600000);
await context.close();
