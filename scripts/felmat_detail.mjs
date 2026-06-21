import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  storageState: "/tmp/felmat_session.json",
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();

// リスティング向きで抽出
await page.goto("https://www.felmat.net/publisher/ad/data?rel_status=0&listing_flg=on");
await page.waitForTimeout(5000);

// prof_detail() を実行してモーダルを開く
await page.evaluate(() => {
  if (typeof prof_detail === "function") prof_detail(12002);
});
await page.waitForTimeout(3000);

await page.screenshot({ path: "/tmp/felmat_detail_modal.png", fullPage: true });

// 表示中モーダルを探す
const visibleModals = page.locator('.modal.in, .modal.show, .modal[style*="display: block"]');
const vmCount = await visibleModals.count();
console.log(`表示中モーダル数: ${vmCount}`);

if (vmCount > 0) {
  const modalText = await visibleModals.first().innerText();
  console.log("\n=== モーダル内容 ===");
  console.log(modalText);
} else {
  // display:blockになっているモーダルを探す
  const candidates = await page.locator('[class*="modal"]').evaluateAll((els) =>
    els.filter(el => el.offsetHeight > 100 && el.style.display !== "none").map(el => ({
      cls: el.className.substring(0, 80),
      h: el.offsetHeight,
      textLen: el.textContent.length,
    }))
  );
  console.log("候補:", candidates.slice(0, 5));

  // 全体から新しく出現した要素を取得
  const overlays = await page.locator('[style*="z-index"]').evaluateAll((els) =>
    els.filter(el => el.offsetHeight > 200).map(el => ({
      tag: el.tagName,
      cls: el.className.substring(0, 60),
      text: el.textContent.trim().substring(0, 300),
    }))
  );
  console.log("z-index要素:", JSON.stringify(overlays.slice(0, 3), null, 2));
}

await browser.close();
