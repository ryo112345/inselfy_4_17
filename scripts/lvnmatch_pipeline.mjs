import { chromium } from "playwright";
import fs from "fs";

const keywords =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["不動産売却 一括査定", "家 売却 査定", "マンション 売却 査定", "不動産 一括査定", "リビンマッチ"];

// オファー先 & 主要ASP（アフィリエイトリンクの中継ドメイン）判定用
const OFFER_HINTS = ["lvnmatch", "lvnmatch.com"];
const ASP_DOMAINS = [
  "felmat.net", "px.a8.net", "a8.net", "afi-b.com", "afi-b", "accesstrade", "h.accesstrade.net",
  "affiliate-b.com", "affiliate-b", "moshimo.com", "af.moshimo.com", "valuecommerce", "ck.jp.ap.valuecommerce.com",
  "rentracks", "tcs-asp", "linksynergy", "i-mobile", "smart-c.jp", "presco.jp", "metps", "circuit-x", "monkey-track",
];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  slowMo: 100,
  viewport: { width: 1400, height: 950 },
  locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});
const page = context.pages()[0] || (await context.newPage());

async function waitPastBlock() {
  for (let i = 0; i < 60; i++) {
    const url = page.url();
    const consent = await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').count();
    if (consent) {
      await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').first().click().catch(() => {});
      await page.waitForTimeout(1500);
      continue;
    }
    const blocked = /\/sorry\//.test(url) || (await page.locator("text=私はロボットではありません").count()) > 0;
    if (!blocked) return true;
    if (i === 0) console.log("⚠️ CAPTCHA検出 → ブラウザで『私はロボットではありません』にチェックを入れてください（最大3分待機）");
    await page.waitForTimeout(3000);
  }
  return false;
}

// 1) 検索して広告(aclk)の遷移先を集める
const adDestSet = new Map(); // url -> {fromKeywords:Set, text}
for (const keyword of keywords) {
  console.log(`\n===== 検索: ${keyword} =====`);
  await page.goto("https://www.google.com/search?q=" + encodeURIComponent(keyword) + "&hl=ja&gl=jp", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await waitPastBlock())) { console.log("CAPTCHA未解決でスキップ"); continue; }
  await page.waitForTimeout(1500);

  const ads = await page.evaluate(() => {
    const out = [];
    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.href || "";
      if (href.includes("aclk?") || href.includes("/aclk")) {
        let dest = "";
        try { dest = new URL(href).searchParams.get("adurl") || ""; } catch {}
        out.push({ dest, text: (a.innerText || "").trim().slice(0, 150) });
      }
    }
    return out;
  });
  let cnt = 0;
  for (const ad of ads) {
    if (!ad.dest) continue;
    cnt++;
    const rec = adDestSet.get(ad.dest) || { fromKeywords: new Set(), text: ad.text };
    rec.fromKeywords.add(keyword);
    if (ad.text && ad.text.length > rec.text.length) rec.text = ad.text;
    adDestSet.set(ad.dest, rec);
  }
  console.log(`広告遷移先(adurl付き): ${cnt} 件`);
  await page.screenshot({ path: `/tmp/lvn_serp_${keyword.replace(/\s+/g, "_")}.png`, fullPage: true });
}

const dests = [...adDestSet.entries()].map(([url, r]) => ({ url, text: r.text, keywords: [...r.fromKeywords] }));
console.log(`\nユニーク広告遷移先: ${dests.length} 件。各LPを巡回します...`);

// 2) 各LPを開いてCTAリンクを解析
const lp = await context.newPage();
const findings = [];
for (const [i, d] of dests.entries()) {
  const r = { index: i, adUrl: d.url, adText: d.text, keywords: d.keywords };
  try {
    await lp.goto(d.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await lp.waitForTimeout(2500);
    r.finalUrl = lp.url();
    r.title = await lp.title();
    const links = await lp.evaluate(() => {
      const set = new Set();
      for (const a of Array.from(document.querySelectorAll("a[href]"))) set.add(a.href);
      // onclick 等で window.location 指定のボタンも拾う
      for (const el of Array.from(document.querySelectorAll("[onclick]"))) {
        const m = (el.getAttribute("onclick") || "").match(/https?:\/\/[^'"\) ]+/g);
        if (m) m.forEach((u) => set.add(u));
      }
      return [...set];
    });
    r.offerLinks = links.filter((u) => OFFER_HINTS.some((h) => u.toLowerCase().includes(h)));
    r.aspLinks = links.filter((u) => ASP_DOMAINS.some((h) => u.toLowerCase().includes(h)));
    r.host = new URL(r.finalUrl).host;
    r.isOfferAffiliateLP = r.offerLinks.length > 0 || r.aspLinks.length > 0;
    await lp.screenshot({ path: `/tmp/lvn_lp_${i}.png`, fullPage: false });
  } catch (e) {
    r.error = String(e).slice(0, 200);
  }
  findings.push(r);
  const tag = r.isOfferAffiliateLP ? "★アフィLP候補" : "  ";
  console.log(`[${i}] ${tag} ${r.host || r.adUrl}  offer:${(r.offerLinks||[]).length} asp:${(r.aspLinks||[]).length} ${r.error ? "ERR:" + r.error : ""}`);
}

fs.writeFileSync("/tmp/lvnmatch_findings.json", JSON.stringify(findings, null, 2));
console.log(`\n結果: /tmp/lvnmatch_findings.json （アフィLP候補/全LP）`);
console.log("ブラウザを閉じます。");
await context.close();
