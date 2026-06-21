import { chromium } from "playwright";
import fs from "fs";

const query = process.argv[2] || "リビンマッチ";

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 100, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

console.log(`透明性センターを開きます。query="${query}"`);
await page.goto("https://adstransparency.google.com/?region=JP&hl=ja", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

// 検索入力を探す
const inputSel = 'input[type="text"], input[aria-label], input[placeholder]';
const input = page.locator(inputSel).first();
await input.waitFor({ timeout: 15000 }).catch(() => console.log("入力欄が見つからない"));
await input.click().catch(() => {});
await input.fill(query).catch(() => {});
await page.waitForTimeout(3500); // オートコンプリート待ち
await page.screenshot({ path: "/tmp/lvn_at_suggest.png", fullPage: false });

// サジェスト候補をダンプ
const suggestions = await page.evaluate(() => {
  const items = [];
  // material系のリスト項目を広めに拾う
  const nodes = document.querySelectorAll('[role="option"], [role="listbox"] *, .suggestion, [class*="suggest" i] *, li');
  const seen = new Set();
  for (const n of nodes) {
    const t = (n.innerText || "").trim();
    if (t && t.length < 80 && !seen.has(t)) { seen.add(t); items.push(t); }
  }
  return items.slice(0, 30);
});
console.log("サジェスト候補:");
suggestions.forEach((s) => console.log("  -", s.replace(/\n/g, " / ")));

// Enterで検索実行も試す
await input.press("Enter").catch(() => {});
await page.waitForTimeout(5000);
await page.screenshot({ path: "/tmp/lvn_at_results.png", fullPage: true });
console.log("現在URL:", page.url());

// 結果ページの広告主リンク・広告カードを収集
const results = await page.evaluate(() => {
  const out = { advertiserLinks: [], texts: [] };
  for (const a of document.querySelectorAll('a[href*="/advertiser/"]')) {
    out.advertiserLinks.push({ href: a.href, text: (a.innerText || "").trim().slice(0, 80) });
  }
  // 広告カードらしきテキスト
  const body = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
  out.texts = body.slice(0, 60);
  return out;
});
console.log(`\n広告主リンク数: ${results.advertiserLinks.length}`);
results.advertiserLinks.slice(0, 20).forEach((a) => console.log(`  ${a.text} => ${a.href}`));

fs.writeFileSync("/tmp/lvn_at.json", JSON.stringify({ query, suggestions, results, url: page.url() }, null, 2));
console.log("\n保存: /tmp/lvn_at.json / スクショ: /tmp/lvn_at_suggest.png, /tmp/lvn_at_results.png");
console.log("確認のため20秒開いたままにします。");
await page.waitForTimeout(20000);
await context.close();
