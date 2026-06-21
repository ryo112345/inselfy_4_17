import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: "/tmp/felmat_session.json",
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();

// フォーム操作でフィルタ
await page.goto("https://www.felmat.net/publisher/ad/data");
await page.waitForTimeout(3000);
await page.check('input[name="listing_flg"]');
await page.selectOption("#display_num", "200");
await page.selectOption("#order_select", { label: "表示順：「承認率」が高い" });
await page.waitForTimeout(500);
await page.click('button:has-text("上記条件で一覧を抽出")');
await page.waitForTimeout(5000);

const results = [];
let pageNum = 1;
let consecutiveEmptyPages = 0;

while (true) {
  // 現在のページの案件を取得
  const listItems = await page.evaluate(() => {
    const btns = document.querySelectorAll('button[onclick*="prof_detail"]');
    return Array.from(btns).map(btn => {
      const match = btn.getAttribute("onclick")?.match(/prof_detail\((\d+)\)/);
      const tr = btn.closest("tr");
      const tds = tr?.querySelectorAll("td");
      const getText = (i) => tds?.[i]?.textContent?.trim() || "-";
      return {
        id: match ? parseInt(match[1]) : 0,
        category: getText(2).split("\n")[0].trim(),
        price: getText(4),
        approvalDays: getText(6),
        approvalRate: getText(7),
        epc: getText(9),
      };
    });
  });

  if (listItems.length === 0) break;

  const targets = listItems.filter(item => item.approvalRate !== "-");
  console.log(`\nページ${pageNum}: ${listItems.length}件中 承認率あり${targets.length}件`);

  if (targets.length === 0) {
    consecutiveEmptyPages++;
    if (consecutiveEmptyPages >= 2) {
      console.log("2ページ連続で承認率なし。打ち切り。");
      break;
    }
  } else {
    consecutiveEmptyPages = 0;
  }

  // このページの承認率あり案件の詳細を取得
  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    process.stdout.write(`  ${results.length + 1} (ID:${item.id})...`);

    const btn = page.locator(`button[onclick="javascript:prof_detail(${item.id})"]`);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    try {
      await page.locator('.modal.in, .modal.show').waitFor({ state: "visible", timeout: 5000 });
    } catch {
      console.log(" モーダル開けず");
      continue;
    }
    await page.waitForTimeout(500);

    const modal = page.locator('.modal.in, .modal.show').first();
    const text = await modal.innerText();

    const nameMatch = text.match(/（(\d+)）(.+?)(?:\n|本人申込)/);
    const advertiserMatch = text.match(/広告主\s*\n(.+)/);
    const rewardMatch = text.match(/報酬条件\s*\n([\s\S]*?)(?=\n(?:通常|稼働開始日))/);
    const priceMatch = text.match(/通常[：:]\s*(.+?)(?:\n|$)/);
    const startMatch = text.match(/稼働開始日\s*\n(.+)/);
    const listingMatch = text.match(/【リスティング】\s*\n([\s\S]*?)(?=\n(?:商標|ユーザー属性|競合|フリマ|\s*閉じる))/);
    const listingStatusMatch = text.match(/(リスティングOK|リスティング条件付き|リスティングNG)/);
    const keywordMatch = text.match(/【想定検索キーワード】\s*\n([\s\S]*?)(?=\n(?:【ターゲット|【却下|成果地点|$))/);
    const rejectMatch = text.match(/【却下条件】\s*\n([\s\S]*?)(?=\n(?:【リスティング|ユーザー属性|競合|商標|フリマ|\s*閉じる))/);
    const targetMatch = text.match(/【ターゲット層】\s*\n(.+)/);
    const competitorMatch = text.match(/競合他社・競合商材\s*\n(.+)/);
    const advantageMatch = text.match(/競合との優位点\s*\n(.+)/);
    const conversionMatch = text.match(/成果地点[:：]?\s*\n([\s\S]*?)(?=\n(?:【却下|【リスティング|ユーザー|$))/);

    results.push({
      id: item.id,
      name: nameMatch ? nameMatch[2].trim() : "",
      advertiser: advertiserMatch ? advertiserMatch[1].trim() : "",
      category: item.category,
      reward_condition: rewardMatch ? rewardMatch[1].trim().replace(/\n/g, " ") : "",
      price: priceMatch ? priceMatch[1].trim() : "",
      approval_rate: item.approvalRate,
      epc: item.epc,
      approval_days: item.approvalDays,
      start_date: startMatch ? startMatch[1].trim() : "",
      listing_status: listingStatusMatch ? listingStatusMatch[1] : "",
      listing_detail: listingMatch ? listingMatch[1].trim().replace(/\n/g, " ") : "",
      keywords: keywordMatch ? keywordMatch[1].trim().replace(/\n/g, " ") : "",
      reject_conditions: rejectMatch ? rejectMatch[1].trim().replace(/\n/g, " ") : "",
      conversion_point: conversionMatch ? conversionMatch[1].trim().replace(/\n/g, " ") : "",
      target: targetMatch ? targetMatch[1].trim() : "",
      competitor: competitorMatch ? competitorMatch[1].trim() : "",
      advantage: advantageMatch ? advantageMatch[1].trim() : "",
    });
    console.log(" OK");

    // モーダル閉じる
    const closeBtn = modal.locator('.close, button:has-text("閉じる")').first();
    await closeBtn.click().catch(() => {});
    try {
      await page.locator('.modal.in, .modal.show').waitFor({ state: "hidden", timeout: 3000 });
    } catch {
      await page.evaluate(() => {
        document.querySelectorAll('.modal').forEach(m => { m.style.display = 'none'; m.classList.remove('in', 'show'); });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
      });
    }
    await page.waitForTimeout(300);
  }

  // 次のページへ
  const nextLink = page.locator('a').filter({ hasText: /^≫$/ }).first();
  const hasNext = await nextLink.isVisible().catch(() => false);
  if (!hasNext) break;
  await nextLink.click();
  await page.waitForTimeout(4000);
  pageNum++;
}

console.log(`\n===== 取得完了: ${results.length}件 =====`);

// Excel出力
const XLSX = (await import("xlsx")).default;
const ws = XLSX.utils.json_to_sheet(results.map(r => ({
  "ID": r.id,
  "案件名": r.name,
  "広告主": r.advertiser,
  "カテゴリ": r.category,
  "報酬条件": r.reward_condition,
  "報酬額": r.price,
  "承認率": r.approval_rate,
  "EPC": r.epc,
  "承認目安日数": r.approval_days,
  "稼働開始日": r.start_date,
  "リスティング状態": r.listing_status,
  "リスティング詳細": r.listing_detail,
  "想定キーワード": r.keywords,
  "却下条件": r.reject_conditions,
  "成果地点": r.conversion_point,
  "ターゲット層": r.target,
  "競合他社": r.competitor,
  "競合優位点": r.advantage,
})));
ws["!cols"] = [
  { wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 20 },
  { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
  { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
  { wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 20 },
  { wch: 25 }, { wch: 25 },
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "felmat");
const outPath = `${process.env.HOME}/Downloads/felmat_listing_details.xlsx`;
XLSX.writeFile(wb, outPath);
console.log(`Excel保存: ${outPath}`);

await browser.close();
