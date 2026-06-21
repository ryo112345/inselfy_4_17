import { chromium } from "playwright";

const keywords = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["不動産売却 一括査定", "不動産一括査定 比較", "不動産売却 おすすめ", "リビンマッチ 評判", "リビンマッチ"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 80, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

async function waitPastBlock() {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').count()) {
      await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').first().click().catch(() => {});
      await page.waitForTimeout(1500); continue;
    }
    const blocked = /\/sorry\//.test(page.url()) || (await page.locator("text=私はロボットではありません").count()) > 0;
    if (!blocked) return true;
    if (i === 0) console.log("⚠️ CAPTCHA → 手動でチェックを入れてください");
    await page.waitForTimeout(3000);
  }
  return false;
}

for (const keyword of keywords) {
  console.log(`\n========== 「${keyword}」 ==========`);
  await page.goto("https://www.google.com/search?q=" + encodeURIComponent(keyword) + "&hl=ja&gl=jp", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await waitPastBlock())) { console.log("CAPTCHA未解決→スキップ"); continue; }
  for (let s = 0; s < 2; s++) { await page.mouse.wheel(0, 1000); await page.waitForTimeout(600); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const bodyText = document.body.innerText || "";
    // 「スポンサー」というラベルがページ内に何回出るか
    const sponsorLabelCount = (bodyText.match(/スポンサー/g) || []).length;

    // スポンサー枠の広告主を推定: aclk アンカー + その表示ドメイン
    const aclkAnchors = Array.from(document.querySelectorAll("a")).filter(a => /aclk/.test(a.href || ""));
    const aclkDomains = new Set();
    for (const a of aclkAnchors) {
      const block = a.closest("div");
      const t = block ? block.innerText : "";
      const m = t.match(/[a-z0-9.-]+\.(?:co\.jp|jp|com|net|info|org)/i);
      if (m) aclkDomains.add(m[0]);
    }

    // 「スポンサー」ラベル直近のブロックに含まれる表示URL/ドメインも別ルートで収集
    // （aclkが取れない新型広告対策: スポンサー見出しを含む祖先からドメインを拾う）
    const sponsorDomains = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim() === "スポンサー") {
        // 近傍の大きめ祖先を探索
        let anc = node.parentElement;
        for (let k = 0; k < 6 && anc; k++) anc = anc.parentElement;
        const t = anc ? anc.innerText : "";
        for (const m of t.matchAll(/[a-z0-9.-]+\.(?:co\.jp|jp|com|net|info|org)/gi)) sponsorDomains.add(m[0]);
      }
    }
    return {
      sponsorLabelCount,
      aclkAnchorCount: aclkAnchors.length,
      aclkDomains: [...aclkDomains],
      sponsorDomains: [...sponsorDomains].slice(0, 15),
    };
  });

  console.log(`「スポンサー」ラベル出現回数: ${info.sponsorLabelCount}`);
  console.log(`aclk広告アンカー数: ${info.aclkAnchorCount}`);
  console.log(`aclk経由の広告主ドメイン: ${info.aclkDomains.join(", ") || "(なし)"}`);
  console.log(`スポンサー枠近傍のドメイン: ${info.sponsorDomains.join(", ") || "(なし)"}`);
  await page.screenshot({ path: `/tmp/lvn_sponsor_${keyword.replace(/\s+/g, "_")}.png` });
}

console.log("\nブラウザを閉じます。");
await context.close();
