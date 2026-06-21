import { chromium } from "playwright";
import fs from "fs";

const domains = process.argv.slice(2).length ? process.argv.slice(2) : ["lvnmatch.jp", "lvnmatch.com", "form.lvnmatch.com"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 100, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

const out = {};
for (const dom of domains) {
  console.log(`\n===== domain: ${dom} =====`);
  await page.goto(`https://adstransparency.google.com/?region=JP&hl=ja&domain=${encodeURIComponent(dom)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  for (let s = 0; s < 3; s++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(700); }

  const info = await page.evaluate(() => {
    const body = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    // 広告数の表記行
    const countLine = body.find((l) => /件の広告/.test(l)) || "";
    // 広告主名（確認済みの並び）
    const advertisers = [];
    for (let i = 0; i < body.length; i++) {
      if (body[i] === "確認済み" && i > 0) advertisers.push(body[i - 1]);
    }
    // クリエイティブの見出しらしき文字列（広告テキスト）
    return { countLine, advertisers: [...new Set(advertisers)].slice(0, 20), topText: body.slice(0, 50) };
  });
  console.log("広告数:", info.countLine || "(不明)");
  console.log("広告主アカウント:", info.advertisers.join(" / ") || "(なし)");
  await page.screenshot({ path: `/tmp/lvn_dom_${dom.replace(/[^a-zA-Z0-9]/g, "_")}.png`, fullPage: true });
  out[dom] = info;
}

fs.writeFileSync("/tmp/lvn_at_domain.json", JSON.stringify(out, null, 2));
console.log("\n保存: /tmp/lvn_at_domain.json / スクショ /tmp/lvn_dom_<domain>.png");
await context.close();
