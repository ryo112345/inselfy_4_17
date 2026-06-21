import { chromium } from "playwright";
import fs from "fs";

const lpUrl = process.argv[2];
if (!lpUrl) { console.error("usage: node analyze_lp.mjs <url>"); process.exit(1); }
const host = new URL(lpUrl).host;
// 登録ドメイン（透明性センターの逆引き用）— 単純に host から先頭の www を除去
const domain = host.replace(/^www\./, "");

const ASP = ["felmat.net", "rentracks", "px.a8.net", "a8.net", "afi-b", "accesstrade", "affiliate-b", "moshimo", "valuecommerce", "smart-c", "i-mobile", "tg-affiliate", "circuit-x", "metps", "presco"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 70, viewport: { width: 1300, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

// 1) 逆引き: 誰が出稿しているか
console.log(`=== 透明性センター逆引き: ${domain} ===`);
await page.goto(`https://adstransparency.google.com/?region=JP&hl=ja&domain=${encodeURIComponent(domain)}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
for (let s = 0; s < 2; s++) { await page.mouse.wheel(0, 1000); await page.waitForTimeout(700); }
const adv = await page.evaluate(() => {
  const body = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const countLine = body.find((l) => /件の広告/.test(l)) || "";
  const advs = [];
  for (let i = 0; i < body.length; i++) if (body[i] === "確認済み" && i > 0) advs.push(body[i - 1]);
  return { countLine, advertisers: [...new Set(advs)].slice(0, 10) };
});
console.log("広告数:", adv.countLine || "(0/不明)");
console.log("出稿主:", adv.advertisers.join(" / ") || "(なし)");

// 2) LP本体を開いてCTAリンク解析
console.log(`\n=== LP解析: ${lpUrl} ===`);
const lp = await context.newPage();
await lp.goto(lpUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await lp.waitForTimeout(3000);
await lp.evaluate(async () => { for (let y=0;y<Math.min(document.body.scrollHeight,12000);y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));} window.scrollTo(0,0); });
await lp.waitForTimeout(1200);
const info = await lp.evaluate((ASP) => {
  const links = new Set();
  for (const a of document.querySelectorAll("a[href]")) links.add(a.href);
  for (const el of document.querySelectorAll("[onclick]")) { const m=(el.getAttribute("onclick")||"").match(/https?:\/\/[^'"\) ]+/g); if(m)m.forEach(u=>links.add(u)); }
  for (const f of document.querySelectorAll("form[action]")) links.add(f.action);
  const all=[...links]; const low=u=>u.toLowerCase();
  return {
    title: document.title,
    asp: all.filter(u=>ASP.some(h=>low(u).includes(h))),
    felmat: all.filter(u=>low(u).includes("felmat")),
    rentracks: all.filter(u=>low(u).includes("rentracks")),
    lvnmatch: all.filter(u=>low(u).includes("lvnmatch")),
    outboundHosts: [...new Set(all.map(u=>{try{return new URL(u).host}catch{return""}}).filter(h=>h && !h.includes(location.host.replace("www.",""))))].slice(0,30),
  };
}, ASP);
console.log("title:", info.title);
console.log("felmat:", info.felmat.length, JSON.stringify(info.felmat.slice(0,5)));
console.log("rentracks:", info.rentracks.length, JSON.stringify(info.rentracks.slice(0,5)));
console.log("lvnmatch:", info.lvnmatch.length, JSON.stringify(info.lvnmatch.slice(0,5)));
console.log("ASP合計:", info.asp.length);
console.log("外部送客先ホスト:", JSON.stringify(info.outboundHosts, null, 2));

// 縦長対策: フルページではなくビューポート2枚
await lp.evaluate(() => window.scrollTo(0, 0)); await lp.waitForTimeout(400);
await lp.screenshot({ path: "/tmp/lp_top.png" });
await lp.evaluate(() => window.scrollTo(0, 1400)); await lp.waitForTimeout(400);
await lp.screenshot({ path: "/tmp/lp_mid.png" });

fs.writeFileSync("/tmp/analyze_lp.json", JSON.stringify({ domain, advertiser: adv, lp: info, lpUrl }, null, 2));
console.log("\n保存: /tmp/analyze_lp.json / スクショ lp_top.png, lp_mid.png");
console.log("ウィンドウは8分開いたままにします。");
await lp.waitForTimeout(480000);
await context.close();
