import { chromium } from "playwright";
import fs from "fs";

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 120, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

// Eleshi.inc を検索して広告主ページへ
await page.goto("https://adstransparency.google.com/?region=JP&hl=ja", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const input = page.locator('input[type="text"], input[aria-label], input[placeholder]').first();
await input.click().catch(() => {});
await input.fill("Eleshi").catch(() => {});
await page.waitForTimeout(3500);
await page.screenshot({ path: "/tmp/lvn_eleshi_suggest.png" });

// サジェスト行のテキストを確認
const rows = await page.evaluate(() => {
  const out = [];
  for (const c of document.querySelectorAll('*')) {
    const t = (c.childElementCount === 0 ? (c.innerText || "") : "").trim();
    if (/Eleshi/i.test(t) && t.length < 60) out.push(t);
  }
  return [...new Set(out)];
});
console.log("Eleshi候補:", rows.join(" | "));

// Eleshi を含む行をクリック
const row = page.locator("text=/Eleshi/i").first();
if (await row.count()) { await row.click().catch(() => {}); }
await page.waitForTimeout(5000);
for (let s = 0; s < 4; s++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(700); }

const url = page.url();
console.log("Eleshi広告主ページ:", url);
const info = await page.evaluate(() => {
  const body = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const countLine = body.find((l) => /件の広告/.test(l)) || "";
  // 各広告の表示ドメイン（クリエイティブ内に出る xxx.jp 等）
  const domains = new Set();
  for (const m of (document.body.innerText || "").matchAll(/[a-z0-9-]+\.(?:co\.jp|jp|com|net)/gi)) domains.add(m[0]);
  return { countLine, domains: [...domains].slice(0, 30), head: body.slice(0, 30) };
});
console.log("広告数:", info.countLine);
console.log("クリエイティブ内ドメイン:", info.domains.join(", "));
await page.screenshot({ path: "/tmp/lvn_eleshi_advertiser.png", fullPage: true });

fs.writeFileSync("/tmp/lvn_eleshi.json", JSON.stringify({ url, ...info }, null, 2));
console.log("\n保存: /tmp/lvn_eleshi.json / スクショ /tmp/lvn_eleshi_advertiser.png");
await context.close();
