import { chromium } from "playwright";
import fs from "fs";

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 60, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

const DENY = /(google|youtube|gstatic|googleadservices|googlesyndication|doubleclick|ggpht|schema\.org)/i;

// 広告主名でサジェストを出し、その行をクリックして広告主ページへ遷移
async function gotoAdvertiser(name) {
  await page.goto("https://adstransparency.google.com/?region=JP&hl=ja", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const input = page.locator('input[type="text"], input[aria-label], input[placeholder]').first();
  await input.click().catch(() => {});
  await input.fill(name).catch(() => {});
  await page.waitForTimeout(3500);
  // 完全一致テキストの行をクリック
  const row = page.locator(`text="${name}"`).first();
  if (!(await row.count())) { console.log(`行が見つからない: ${name}`); return null; }
  await row.click().catch((e) => console.log("クリック失敗", String(e).slice(0, 80)));
  await page.waitForTimeout(5000);
  const url = page.url();
  if (!/\/advertiser\//.test(url)) { console.log(`遷移せず(${name}) url=${url}`); return null; }
  return url;
}

async function collectDomains(name, label) {
  const advUrl = await gotoAdvertiser(name);
  if (!advUrl) return { advUrl: null, label, domains: {}, countLine: "" };
  console.log(`\n##### ${label}: ${advUrl}`);
  await page.waitForTimeout(2000);

  const domains = {};
  let stable = 0;
  let prevCount = 0;
  for (let i = 0; i < 60 && stable < 4; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(900);
    const found = await page.evaluate(() => {
      const txt = document.body.innerText || "";
      const re = /\b([a-z0-9-]+\.)+(?:co\.jp|ne\.jp|or\.jp|jp|com|net|info|org|me|tokyo|shop|site|biz|io)\b/gi;
      return (txt.match(re) || []);
    });
    for (const d of found) {
      const dom = d.toLowerCase();
      if (DENY.test(dom)) continue;
      domains[dom] = (domains[dom] || 0) + 1;
    }
    const cnt = Object.keys(domains).length;
    if (cnt === prevCount) stable++; else stable = 0;
    prevCount = cnt;
  }
  // 件数表記
  const countLine = await page.evaluate(() => {
    const l = (document.body.innerText || "").split("\n").map((s) => s.trim()).find((s) => /件の広告/.test(s));
    return l || "";
  });
  console.log("広告数表記:", countLine);
  console.log(`ユニーク送客先ドメイン: ${Object.keys(domains).length}`);
  return { advUrl, label, countLine, domains };
}

const accounts = ["Eleshi.inc", "株式会社Eleshi"];
const results = [];
for (const name of accounts) {
  results.push(await collectDomains(name, name));
}

// 全アカウント統合ドメイン集計
const merged = {};
for (const r of results) for (const [d, c] of Object.entries(r.domains)) merged[d] = (merged[d] || 0) + c;
const sorted = Object.entries(merged).sort((a, b) => b[1] - a[1]);

console.log("\n========== Eleshi 送客先ドメイン（出現回数順） ==========");
for (const [d, c] of sorted) console.log(`  ${String(c).padStart(4)}  ${d}`);

fs.writeFileSync("/tmp/eleshi_domains.json", JSON.stringify({ links, results, mergedSorted: sorted }, null, 2));
console.log("\n保存: /tmp/eleshi_domains.json");
await context.close();
