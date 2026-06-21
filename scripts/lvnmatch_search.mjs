import { chromium } from "playwright";
import fs from "fs";

// 検索キーワード（コマンドライン引数で複数指定可。無ければデフォルト群）
const keywords =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["不動産売却 一括査定", "家 売却 査定", "マンション売却 査定", "リビンマッチ"];

const userDataDir = "/tmp/chrome_user_data_lvn";

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  slowMo: 120,
  viewport: { width: 1400, height: 950 },
  locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});

// webdriver プロパティを偽装（CAPTCHA回避）
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});

const page = context.pages()[0] || (await context.newPage());

// CAPTCHA/同意ページを抜けるまで待つヘルパー（手動でチェックを押してもらう）
async function waitPastBlock() {
  for (let i = 0; i < 60; i++) {
    const url = page.url();
    const blocked = /\/sorry\//.test(url) || (await page.locator("text=私はロボットではありません").count()) > 0;
    const consent = (await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').count()) > 0;
    if (consent) {
      await page.locator('button:has-text("すべて同意"), button:has-text("同意する")').first().click().catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    if (!blocked) return true;
    if (i === 0) console.log("⚠️ CAPTCHA検出。ブラウザで『私はロボットではありません』に手動チェックを入れてください。最大3分待機します...");
    await page.waitForTimeout(3000);
  }
  return false;
}

const allResults = {};

for (const keyword of keywords) {
  console.log(`\n========== 検索: ${keyword} ==========`);
  await page.goto("https://www.google.com/search?q=" + encodeURIComponent(keyword) + "&hl=ja&gl=jp", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);

  const ok = await waitPastBlock();
  if (!ok) {
    console.log("CAPTCHAを抜けられませんでした。スキップします。");
    continue;
  }

  // 検索結果が出るまで少し待つ
  await page.waitForTimeout(2000);

  // 広告（スポンサー）= aclk 経由アンカーを抽出
  const ads = await page.evaluate(() => {
    const out = [];
    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.href || "";
      if (href.includes("aclk?") || href.includes("/aclk")) {
        let dest = "";
        try {
          dest = new URL(href).searchParams.get("adurl") || "";
        } catch {}
        const text = (a.innerText || "").trim().slice(0, 150);
        // 表示URL（広告に表示されるドメイン）も拾う
        out.push({ dest, text });
      }
    }
    return out;
  });

  // dest または text でユニーク化
  const seen = new Set();
  const unique = [];
  for (const ad of ads) {
    const key = ad.dest || ad.text;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(ad);
  }

  console.log(`広告アンカー: ${ads.length} 件 / ユニーク: ${unique.length} 件`);
  for (const [i, ad] of unique.entries()) {
    console.log(`  [${i}] ${ad.dest || "(adurlなし)"}`);
    console.log(`       ${ad.text.replace(/\n/g, " | ")}`);
  }

  await page.screenshot({ path: `/tmp/lvnmatch_${keyword.replace(/\s+/g, "_")}.png`, fullPage: true });
  allResults[keyword] = unique;
}

fs.writeFileSync("/tmp/lvnmatch_ads.json", JSON.stringify(allResults, null, 2));
console.log("\n結果を /tmp/lvnmatch_ads.json に保存しました。");
console.log("ブラウザは開いたままにします（このプロセスを止めるまで）。確認後 Ctrl+C で終了してください。");

// プロセスを生かしておく（次ステップでLP巡回するため）
await new Promise(() => {});
