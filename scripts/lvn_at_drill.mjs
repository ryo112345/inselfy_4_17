import { chromium } from "playwright";
import fs from "fs";

// 掘り下げる広告主（検索語 → 期待行テキストの一部）
const targets = [
  { q: "リビン・テクノロジーズ", match: "リビン・テクノロジーズ" },
  { q: "my-best.com", match: "my-best.com" },
];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 120, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

const out = {};
for (const t of targets) {
  console.log(`\n===== 掘り下げ: ${t.q} =====`);
  await page.goto("https://adstransparency.google.com/?region=JP&hl=ja", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const input = page.locator('input[type="text"], input[aria-label], input[placeholder]').first();
  await input.click().catch(() => {});
  await input.fill(t.q).catch(() => {});
  await page.waitForTimeout(3500);

  // マッチする行をクリック
  const row = page.locator(`text=${t.match}`).first();
  const exists = await row.count();
  if (!exists) { console.log("該当行なし"); out[t.q] = { found: false }; continue; }
  await row.click().catch((e) => console.log("クリック失敗", String(e).slice(0, 80)));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log("広告主ページURL:", url);

  // 広告数・クリエイティブのテキストを収集
  const info = await page.evaluate(() => {
    const body = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    // 広告クリエイティブ枠の数（iframe や ad card）
    const iframes = document.querySelectorAll("iframe").length;
    const imgs = Array.from(document.querySelectorAll("img")).map((i) => i.src).filter((s) => /googleusercontent|tpc\.googlesyndication|adservice/.test(s)).slice(0, 10);
    return { topText: body.slice(0, 40), iframes, creativeImgs: imgs };
  });
  console.log("広告主ページ上部テキスト:");
  info.topText.forEach((s) => console.log("   ", s));
  console.log(`iframe数: ${info.iframes} / クリエイティブ画像候補: ${info.creativeImgs.length}`);

  await page.screenshot({ path: `/tmp/lvn_adv_${t.q.replace(/[^a-zA-Z0-9]/g, "_")}.png`, fullPage: true });
  out[t.q] = { found: true, url, ...info };
}

fs.writeFileSync("/tmp/lvn_at_drill.json", JSON.stringify(out, null, 2));
console.log("\n保存: /tmp/lvn_at_drill.json / スクショ /tmp/lvn_adv_<q>.png");
await context.close();
