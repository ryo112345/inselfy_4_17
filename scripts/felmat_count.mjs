import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: "/tmp/felmat_session.json",
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();

await page.goto("https://www.felmat.net/publisher/ad/data");
await page.waitForTimeout(3000);

await page.check('input[name="listing_flg"]');
await page.selectOption("#display_num", "200");
await page.selectOption("#order_select", { label: "表示順：「承認率」が高い" });
await page.waitForTimeout(500);
await page.click('button:has-text("上記条件で一覧を抽出")');
await page.waitForTimeout(5000);

let pageNum = 1;
let totalWithRate = 0;
let totalAll = 0;

while (true) {
  const rates = await page.evaluate(() => {
    const btns = document.querySelectorAll('button[onclick*="prof_detail"]');
    return Array.from(btns).map(btn => {
      const tr = btn.closest("tr");
      const tds = tr?.querySelectorAll("td");
      return tds?.[7]?.textContent?.trim() || "-";
    });
  });

  if (rates.length === 0) break;

  const withRate = rates.filter(r => r !== "-").length;
  totalWithRate += withRate;
  totalAll += rates.length;

  console.log(`ページ${pageNum}: ${rates.length}件 (承認率あり:${withRate} なし:${rates.length - withRate}) 例:${rates.slice(0, 3)}`);

  if (withRate === 0) {
    console.log("→ 全件なし。打ち切り。");
    break;
  }

  // 次ページ
  const nextLink = page.locator(`a`).filter({ hasText: new RegExp(`^${pageNum + 1}$`) }).first();
  const hasNext = await nextLink.isVisible().catch(() => false);
  if (!hasNext) {
    const rrLink = page.locator('a:has-text("≫")').first();
    const hasRR = await rrLink.isVisible().catch(() => false);
    if (!hasRR) break;
    await rrLink.click();
  } else {
    await nextLink.click();
  }
  await page.waitForTimeout(4000);
  pageNum++;
}

console.log(`\n===== 結果 =====`);
console.log(`承認率あり: ${totalWithRate}件`);
console.log(`全体: ${totalAll}件`);

await browser.close();
