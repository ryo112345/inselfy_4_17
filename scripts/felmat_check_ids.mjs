import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: "/tmp/felmat_session.json",
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();

await page.goto("https://www.felmat.net/publisher/ad/data?rel_status=0&listing_flg=on&display_num=20");
await page.waitForTimeout(5000);

// 各ボタンの詳細情報を取得
const buttons = await page.locator('button[onclick*="prof_detail"]').evaluateAll((els) =>
  els.map((el) => {
    const match = el.getAttribute("onclick")?.match(/prof_detail\((\d+)\)/);
    const tr = el.closest("tr");
    const rowIndex = tr ? tr.rowIndex : -1;
    const parentClass = el.parentElement?.className || "";
    const isVisible = el.offsetParent !== null;
    const btnText = el.textContent.trim();
    return {
      id: match ? match[1] : null,
      rowIndex,
      parentClass: parentClass.substring(0, 50),
      isVisible,
      btnText,
    };
  })
);

console.log("全ボタン:");
buttons.forEach((b, i) => console.log(`  ${i}: ID=${b.id} row=${b.rowIndex} visible=${b.isVisible} text="${b.btnText}" parent="${b.parentClass}"`));

// 重複IDがあるか確認
const idCounts = {};
buttons.forEach(b => { idCounts[b.id] = (idCounts[b.id] || 0) + 1; });
const dupes = Object.entries(idCounts).filter(([, c]) => c > 1);
console.log("\n重複ID:", dupes);

await browser.close();
