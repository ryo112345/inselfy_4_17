import { chromium } from "playwright";
import fs from "fs";

const advUrl = "https://adstransparency.google.com/advertiser/AR16633425391192637441?region=JP&hl=ja";

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 60, viewport: { width: 1400, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

await page.goto(advUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(800); }

const probe = await page.evaluate(() => {
  const iframes = Array.from(document.querySelectorAll("iframe"));
  const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href).filter((h) => !/google|youtube|gstatic/.test(h));
  // creative card らしき要素を推定
  const cardSelectors = ["creative-preview", "[class*=creative]", "[class*=Creative]", "priority-creative-grid *"];
  let firstCardHtml = "";
  const f = iframes[0];
  if (f) {
    let card = f;
    for (let k = 0; k < 5 && card.parentElement; k++) card = card.parentElement;
    firstCardHtml = card.outerHTML.slice(0, 1800);
  }
  // aria-label / title / alt 属性に domain がないか
  const attrs = [];
  for (const el of document.querySelectorAll("[aria-label],[title],[alt]")) {
    const v = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt") || "";
    if (/\.(jp|com|net)/.test(v)) attrs.push(v.slice(0, 80));
  }
  return {
    iframeCount: iframes.length,
    iframeSrcSample: iframes.slice(0, 5).map((f) => (f.src || "").slice(0, 120)),
    nonGoogleAnchors: [...new Set(anchors)].slice(0, 20),
    domainAttrs: [...new Set(attrs)].slice(0, 20),
    firstCardHtml,
  };
});
console.log("iframe数:", probe.iframeCount);
console.log("iframe src例:", JSON.stringify(probe.iframeSrcSample, null, 2));
console.log("非googleアンカー:", JSON.stringify(probe.nonGoogleAnchors, null, 2));
console.log("domain属性:", JSON.stringify(probe.domainAttrs, null, 2));
console.log("\n--- 最初のカードHTML ---\n", probe.firstCardHtml);

// 最初のカードをクリックして詳細ダイアログを見る
try {
  await page.locator("iframe").first().click({ timeout: 5000 });
  await page.waitForTimeout(3000);
  const dialog = await page.evaluate(() => {
    const t = document.body.innerText;
    // 詳細ダイアログ内のドメイン・URLらしき行
    const urls = [...t.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]).filter((u) => !/google|youtube|gstatic/.test(u)).slice(0, 10);
    const doms = [...t.matchAll(/\b([a-z0-9-]+\.)+(?:co\.jp|jp|com|net)\b/gi)].map((m) => m[0]).filter((d) => !/google|youtube|gstatic/.test(d));
    return { urls, doms: [...new Set(doms)].slice(0, 15) };
  });
  console.log("\n--- カード詳細ダイアログ ---");
  console.log("URLs:", JSON.stringify(dialog.urls, null, 2));
  console.log("domains:", JSON.stringify(dialog.doms, null, 2));
  await page.screenshot({ path: "/tmp/eleshi_card_detail.png" });
} catch (e) {
  console.log("カードクリック失敗:", String(e).slice(0, 120));
}

await page.screenshot({ path: "/tmp/eleshi_advertiser_page.png", fullPage: true });
fs.writeFileSync("/tmp/eleshi_probe.json", JSON.stringify(probe, null, 2));
console.log("\n保存: /tmp/eleshi_probe.json / スクショ eleshi_advertiser_page.png, eleshi_card_detail.png");
await context.close();
