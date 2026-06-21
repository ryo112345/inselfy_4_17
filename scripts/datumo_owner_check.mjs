import { chromium } from "playwright";
import fs from "fs";

const sites = process.argv.slice(2).length ? process.argv.slice(2) : ["https://datumo-tokyo.net/"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 80, viewport: { width: 1300, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

const out = {};
for (const site of sites) {
  const rec = { site };
  try {
    await page.goto(site, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    rec.title = await page.title();

    // 運営者情報/会社概要/プライバシー系リンクを収集
    const links = await page.evaluate(() => {
      const out = [];
      for (const a of document.querySelectorAll("a[href]")) {
        const t = (a.innerText || "").trim();
        if (/運営|会社|company|about|privacy|プライバシー|概要|運営者/i.test(t + " " + a.href)) {
          out.push({ text: t.slice(0, 40), href: a.href });
        }
      }
      return out;
    });
    rec.infoLinks = links.slice(0, 12);

    // 運営者情報ページを開いて本文を取得
    const target = links.find((l) => /運営者|運営会社|company|会社概要/i.test(l.text + l.href)) || links.find((l) => /運営|about/i.test(l.text + l.href));
    if (target) {
      rec.infoPage = target.href;
      await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n"));
      rec.infoText = text.slice(0, 1500);
      rec.mentionsEleshi = /Eleshi/i.test(text);
      // 法人番号/住所の手がかり
      rec.kumamoto = /熊本/.test(text);
      await page.screenshot({ path: "/tmp/datumo_owner.png", fullPage: true });
    }
  } catch (e) {
    rec.error = String(e).slice(0, 200);
  }
  out[site] = rec;
  console.log(JSON.stringify(rec, null, 2));
}

fs.writeFileSync("/tmp/datumo_owner.json", JSON.stringify(out, null, 2));
console.log("保存: /tmp/datumo_owner.json / スクショ /tmp/datumo_owner.png");
await context.close();
