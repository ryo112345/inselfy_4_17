import { chromium } from "playwright";
import fs from "fs";

const keywords =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : [
        "不動産売却 おすすめ",
        "不動産一括査定 比較",
        "不動産一括査定 ランキング",
        "マンション売却 おすすめ",
        "不動産 売却 比較",
        "リビンマッチ 評判",
      ];

const TOP_N = 6; // 各キーワードの上位 organic 件数

const ASP_DOMAINS = [
  "felmat.net", "px.a8.net", "a8.net", "afi-b.com", "afi-b", "accesstrade", "h.accesstrade.net",
  "affiliate-b.com", "affiliate-b", "moshimo.com", "af.moshimo.com", "valuecommerce", "ck.jp.ap.valuecommerce.com",
  "rentracks", "tcs-asp", "linksynergy", "i-mobile", "smart-c.jp", "presco.jp", "metps", "circuit-x", "tg-affiliate",
];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 80, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

async function waitPastBlock() {
  for (let i = 0; i < 60; i++) {
    if (await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').count()) {
      await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').first().click().catch(() => {});
      await page.waitForTimeout(1500); continue;
    }
    const blocked = /\/sorry\//.test(page.url()) || (await page.locator("text=私はロボットではありません").count()) > 0;
    if (!blocked) return true;
    if (i === 0) console.log("⚠️ CAPTCHA → ブラウザでチェックを入れてください");
    await page.waitForTimeout(3000);
  }
  return false;
}

// 1) 各キーワードの organic 上位リンクを収集
const organicMap = new Map(); // url -> {keywords:Set, title}
for (const keyword of keywords) {
  console.log(`\n===== 検索: ${keyword} =====`);
  await page.goto("https://www.google.com/search?q=" + encodeURIComponent(keyword) + "&hl=ja&gl=jp&num=20", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await waitPastBlock())) { console.log("CAPTCHA未解決→スキップ"); continue; }
  await page.waitForTimeout(1500);

  const results = await page.evaluate(() => {
    const out = [];
    for (const h of Array.from(document.querySelectorAll("h3"))) {
      const a = h.closest("a[href]");
      if (!a) continue;
      const href = a.href || "";
      if (!/^https?:\/\//.test(href)) continue;
      if (/google\.|gstatic\.|googleusercontent|youtube\.com|\/aclk|googleadservices/.test(href)) continue;
      out.push({ href, title: (h.innerText || "").trim().slice(0, 100) });
    }
    return out;
  });
  let n = 0;
  for (const r of results) {
    if (n >= TOP_N) break;
    n++;
    const host = new URL(r.href).host;
    const rec = organicMap.get(r.href) || { keywords: new Set(), title: r.title, host };
    rec.keywords.add(keyword);
    organicMap.set(r.href, rec);
  }
  console.log(`organic 取得: ${Math.min(n, results.length)} 件 / 全${results.length}`);
}

const targets = [...organicMap.entries()].map(([url, r]) => ({ url, title: r.title, host: r.host, keywords: [...r.keywords] }));
console.log(`\nユニーク organic LP: ${targets.length} 件。各ページのCTAリンクを解析します...`);

// 2) 各 organic ページで リビンマッチ/ASP リンクを抽出
const lp = await context.newPage();
const findings = [];
for (const [i, t] of targets.entries()) {
  const r = { index: i, url: t.url, host: t.host, title: t.title, keywords: t.keywords };
  try {
    await lp.goto(t.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await lp.waitForTimeout(2500);
    await lp.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await lp.waitForTimeout(800);
    const links = await lp.evaluate(() => {
      const set = new Set();
      for (const a of Array.from(document.querySelectorAll("a[href]"))) set.add(a.href);
      for (const el of Array.from(document.querySelectorAll("[onclick]"))) {
        const m = (el.getAttribute("onclick") || "").match(/https?:\/\/[^'"\) ]+/g);
        if (m) m.forEach((u) => set.add(u));
      }
      return [...set];
    });
    const low = (u) => u.toLowerCase();
    r.formLvnLinks = [...new Set(links.filter((u) => low(u).includes("form.lvnmatch.com")))];
    r.lvnLinks = [...new Set(links.filter((u) => low(u).includes("lvnmatch")))];
    r.aspLinks = [...new Set(links.filter((u) => ASP_DOMAINS.some((h) => low(u).includes(h))))];
    r.hasLivin = r.lvnLinks.length > 0;
    r.hasAffiliateButton = r.formLvnLinks.length > 0 || r.aspLinks.length > 0;
    await lp.screenshot({ path: `/tmp/lvn_org_${i}.png`, fullPage: false });
  } catch (e) {
    r.error = String(e).slice(0, 150);
  }
  findings.push(r);
  const mark = r.hasAffiliateButton ? "★★アフィLP" : r.hasLivin ? "★リビン掲載" : "  ";
  console.log(`[${i}] ${mark} ${r.host}  formLvn:${(r.formLvnLinks||[]).length} asp:${(r.aspLinks||[]).length} lvn:${(r.lvnLinks||[]).length} ${r.error||""}`);
  if ((r.formLvnLinks||[]).length) r.formLvnLinks.slice(0,3).forEach((u) => console.log(`        → ${u}`));
}

fs.writeFileSync("/tmp/lvnmatch_organic.json", JSON.stringify(findings, null, 2));
console.log(`\n結果: /tmp/lvnmatch_organic.json`);
console.log("ブラウザを閉じます。");
await context.close();
