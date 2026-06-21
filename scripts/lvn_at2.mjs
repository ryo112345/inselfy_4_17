import { chromium } from "playwright";
import fs from "fs";

const queries = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["lvnmatch.com", "リビン", "Living", "リビン・テクノロジーズ", "lvnmatch", "my-best.com", "vertex-j.com"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 100, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

await page.goto("https://adstransparency.google.com/?region=JP&hl=ja", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

const summary = {};
for (const q of queries) {
  console.log(`\n===== query: ${q} =====`);
  const input = page.locator('input[type="text"], input[aria-label], input[placeholder]').first();
  await input.click().catch(() => {});
  await input.fill("").catch(() => {});
  await page.waitForTimeout(400);
  await input.fill(q).catch(() => {});
  await page.waitForTimeout(3500);

  // ドロップダウン内の「行」を取得: 広告主名・所在国・広告数 を含む候補要素
  const rows = await page.evaluate(() => {
    // 検索パネル直下のクリック可能要素を走査
    const out = [];
    const candidates = document.querySelectorAll('material-list-item, [role="option"], [class*="result" i], [class*="suggestion" i], a, [jsaction]');
    const seen = new Set();
    for (const c of candidates) {
      const t = (c.innerText || "").trim().replace(/\s+/g, " ");
      if (!t || t.length > 120 || seen.has(t)) continue;
      // 「広告主/所在国/ウェブサイト」見出しや空のものは除外、件数や国名を含む実データ行を優先
      if (/広告の数|所在国|ウェブサイト|もっと見る|ログイン|よくある質問|政治広告|すべてのトピック|安全かつ|透明性/.test(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out.slice(0, 25);
  });
  console.log(`候補行(${rows.length}):`);
  rows.forEach((r) => console.log("  •", r));
  summary[q] = rows;
  await page.screenshot({ path: `/tmp/lvn_at_${q.replace(/[^a-zA-Z0-9]/g, "_")}.png` });
}

fs.writeFileSync("/tmp/lvn_at2.json", JSON.stringify(summary, null, 2));
console.log("\n保存: /tmp/lvn_at2.json と各スクショ /tmp/lvn_at_<query>.png");
await context.close();
