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
        "家 売却 査定 比較",
        "リビンマッチ 評判",
        "リビンマッチ 口コミ",
      ];

// 分類用ドメイン
const OFFICIAL = ["lvnmatch.jp"];                 // 公式（広告主本人）
const OFFER_FORM = ["form.lvnmatch.com"];          // アフィリエイト経由の申込フォーム
const OFFER_ANY = ["lvnmatch"];                    // lvnmatch を含む
const ASP_DOMAINS = [
  "felmat.net", "px.a8.net", "a8.net", "afi-b.com", "afi-b", "accesstrade", "h.accesstrade.net",
  "affiliate-b.com", "affiliate-b", "moshimo.com", "af.moshimo.com", "valuecommerce", "ck.jp.ap.valuecommerce.com",
  "rentracks", "tcs-asp", "linksynergy", "i-mobile", "smart-c.jp", "presco.jp", "metps", "circuit-x",
];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 100, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
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
    if (i === 0) console.log("⚠️ CAPTCHA → ブラウザでチェックを入れてください（最大3分待機）");
    await page.waitForTimeout(3000);
  }
  return false;
}

// 1) 検索 → 広告(aclk)アンカーを収集（adurl有無に関わらず href を保持）
const adMap = new Map(); // aclkHref -> {keyword, heading, shownDomain}
for (const keyword of keywords) {
  console.log(`\n===== 検索: ${keyword} =====`);
  await page.goto("https://www.google.com/search?q=" + encodeURIComponent(keyword) + "&hl=ja&gl=jp", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await waitPastBlock())) { console.log("CAPTCHA未解決→スキップ"); continue; }
  // 広告は遅延読込のことがあるのでスクロール＋待機
  for (let s = 0; s < 3; s++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(800); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  const ads = await page.evaluate(() => {
    const out = [];
    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.href || "";
      if (!(href.includes("aclk?") || href.includes("/aclk"))) continue;
      // 見出しテキスト（短いものは無視されがちなので親も見る）
      const heading = (a.innerText || a.closest("[role=heading]")?.innerText || "").trim().slice(0, 120);
      // 表示ドメイン: 祖先ブロックの innerText から domain らしき文字列を拾う
      const block = a.closest("div");
      const btxt = block ? block.innerText : "";
      const m = btxt.match(/[a-z0-9.-]+\.(?:jp|com|net|co\.jp|info|org)/i);
      out.push({ href, heading, shownDomain: m ? m[0] : "" });
    }
    return out;
  });
  let added = 0;
  for (const ad of ads) {
    if (adMap.has(ad.href)) continue;
    adMap.set(ad.href, { keyword, heading: ad.heading, shownDomain: ad.shownDomain });
    added++;
  }
  console.log(`広告アンカー: ${ads.length} 件（新規 ${added}）  表示ドメイン例: ${[...new Set(ads.map(a => a.shownDomain).filter(Boolean))].slice(0,6).join(", ")}`);
  await page.screenshot({ path: `/tmp/lvn2_serp_${keyword.replace(/\s+/g, "_")}.png`, fullPage: true });
}

const ads = [...adMap.entries()].map(([href, v]) => ({ href, ...v }));
console.log(`\nユニーク広告アンカー: ${ads.length} 件。aclkを辿ってLPを解析します...`);

// 2) aclk を辿って最終LP・CTAリンクを解析
const lp = await context.newPage();
const findings = [];
for (const [i, ad] of ads.entries()) {
  const r = { index: i, keyword: ad.keyword, heading: ad.heading, shownDomain: ad.shownDomain };
  try {
    await lp.goto(ad.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await lp.waitForTimeout(3000);
    r.finalUrl = lp.url();
    r.host = new URL(r.finalUrl).host;
    const links = await lp.evaluate(() => {
      const set = new Set();
      for (const a of Array.from(document.querySelectorAll("a[href]"))) set.add(a.href);
      for (const el of Array.from(document.querySelectorAll("[onclick]"))) {
        const m = (el.getAttribute("onclick") || "").match(/https?:\/\/[^'"\) ]+/g);
        if (m) m.forEach((u) => set.add(u));
      }
      // form の action も拾う
      for (const f of Array.from(document.querySelectorAll("form[action]"))) set.add(f.action);
      return [...set];
    });
    const low = (u) => u.toLowerCase();
    r.formLinks = links.filter((u) => OFFER_FORM.some((h) => low(u).includes(h)));
    r.lvnmatchLinks = links.filter((u) => OFFER_ANY.some((h) => low(u).includes(h)));
    r.aspLinks = links.filter((u) => ASP_DOMAINS.some((h) => low(u).includes(h)));
    const isOfficialHost = OFFICIAL.some((h) => r.host.includes(h));
    // 分類
    if (r.formLinks.length || r.aspLinks.length) r.verdict = "AFFILIATE_LP"; // アフィリエイトLP
    else if (isOfficialHost) r.verdict = "OFFICIAL";                          // 公式
    else if (r.lvnmatchLinks.length) r.verdict = "MAYBE_AFFILIATE";           // lvnmatchへ送客（要確認）
    else r.verdict = "OTHER_OFFER";                                           // 別オファー
    await lp.screenshot({ path: `/tmp/lvn2_lp_${i}.png`, fullPage: false });
  } catch (e) {
    r.verdict = "ERROR"; r.error = String(e).slice(0, 150);
  }
  findings.push(r);
  const mark = { AFFILIATE_LP: "★★アフィLP", MAYBE_AFFILIATE: "★要確認", OFFICIAL: "公式", OTHER_OFFER: "別offer", ERROR: "ERR" }[r.verdict];
  console.log(`[${i}] ${mark}  ${r.host || ad.shownDomain}  form:${(r.formLinks||[]).length} asp:${(r.aspLinks||[]).length} lvn:${(r.lvnmatchLinks||[]).length}  ${r.error||""}`);
}

fs.writeFileSync("/tmp/lvnmatch_findings2.json", JSON.stringify(findings, null, 2));
console.log(`\n結果: /tmp/lvnmatch_findings2.json`);
console.log("ブラウザを閉じます。");
await context.close();
