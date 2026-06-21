import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// ログイン
await page.goto("https://www.felmat.net/publisher/login");
const loginInput = await page.locator('input[name="login_id"], input[type="text"]').first();
await loginInput.fill("akiyamaryo715");
await page.fill('input[type="password"]', "Akiyamaryo715");
await Promise.all([
  page.waitForURL((url) => !url.href.includes("login"), { timeout: 15000 }).catch(() => {}),
  page.click('button[type="submit"], input[type="submit"]'),
]);
await page.waitForTimeout(2000);

// 「全て」ページに遷移
await page.goto("https://www.felmat.net/publisher/ad/data?rel_status=0");
await page.waitForTimeout(3000);

// 表示件数を200件に変更
await page.selectOption("#display_num", "200");

// 「リスティング向き」チェックボックスをオン
await page.check('input[name="listing_flg"]');
await page.waitForTimeout(500);

// 「上記条件で一覧を抽出」をクリック
await page.click('button:has-text("上記条件で一覧を抽出")');
await page.waitForTimeout(5000);

console.log("抽出後URL:", page.url());
await page.screenshot({ path: "/tmp/felmat_listing_result.png", fullPage: true });

// テーブルのヘッダーを取得
const tables = page.locator("table");
const tableCount = await tables.count();
console.log(`テーブル数: ${tableCount}`);

// 各広告案件の情報を抽出
// felmatの広告一覧はカード形式の可能性もあるので、構造を確認
const adCards = page.locator('[class*="ad_list"], [class*="promo"], [class*="campaign"], .dataListBox, .ad-item, tr');
const cardCount = await adCards.count();
console.log(`案件要素数: ${cardCount}`);

// ページ全体のテキスト構造からデータを把握
const bodyText = await page.locator("body").innerText();
const lines = bodyText.split("\n").map(l => l.trim()).filter(Boolean);

// 重要な指標を含む行を抽出
const keywords = ["報酬", "EPC", "承認率", "単価", "成果", "CVR", "クリック", "件数", "リスティング", "成果地点", "成果条件"];
const relevantLines = lines.filter(l => keywords.some(k => l.includes(k)));
console.log("\n=== 指標関連テキスト ===");
relevantLines.slice(0, 50).forEach(l => console.log(l.substring(0, 120)));

// 最初の数案件の詳細テキストを取得
console.log("\n=== ページ内容（先頭2000文字） ===");
console.log(bodyText.substring(0, 2000));

// テーブルがある場合はヘッダーと数行を表示
for (let t = 0; t < tableCount; t++) {
  const headers = await tables.nth(t).locator("th").allTextContents();
  if (headers.length > 2) {
    console.log(`\nテーブル${t}ヘッダー:`, headers.map(h => h.trim()));
    const rows = await tables.nth(t).locator("tr").count();
    for (let r = 0; r < Math.min(rows, 5); r++) {
      const cells = await tables.nth(t).locator("tr").nth(r).locator("td").allTextContents();
      if (cells.length > 0) {
        console.log(`  行${r}:`, cells.map(c => c.trim().substring(0, 40)));
      }
    }
  }
}

await browser.close();
