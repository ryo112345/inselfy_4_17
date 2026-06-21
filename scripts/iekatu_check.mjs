import { chromium } from "playwright";
import fs from "fs";

const lpUrl =
  process.argv[2] ||
  "https://iekatu-life.com/iekatu-life-U/?gad_source=1&gad_campaignid=23845688316&gclid=Cj0KCQjwrs7RBhDuARIsAIVfBD0tuLm9vCI54ZsvKTETPOXWwSdb-qn5NxX4HNxMTn_DGbdbCGxrm20aAhyOEALw_wcB";

const ASP = ["felmat.net", "rentracks", "px.a8.net", "a8.net", "afi-b", "accesstrade", "affiliate-b", "moshimo", "valuecommerce", "smart-c", "i-mobile", "tg-affiliate", "circuit-x"];

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 70, viewport: { width: 1300, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

// 1) 透明性センターで iekatu-life.com を逆引き（誰が出稿しているか）
console.log("=== 透明性センター逆引き: iekatu-life.com ===");
await page.goto("https://adstransparency.google.com/?region=JP&hl=ja&domain=iekatu-life.com", { waitUntil: "domcontentloaded" });
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
await page.screenshot({ path: "/tmp/iekatu_transparency.png", fullPage: true });

// 2) LP本体を開いてCTAリンクを解析
console.log("\n=== LP解析: iekatu-life ===");
const lp = await context.newPage();
await lp.goto(lpUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await lp.waitForTimeout(3000);
await lp.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));} window.scrollTo(0,0); });
await lp.waitForTimeout(1200);
const info = await lp.evaluate((ASP) => {
  const links = new Set();
  for (const a of document.querySelectorAll("a[href]")) links.add(a.href);
  for (const el of document.querySelectorAll("[onclick]")) { const m=(el.getAttribute("onclick")||"").match(/https?:\/\/[^'"\) ]+/g); if(m)m.forEach(u=>links.add(u)); }
  for (const f of document.querySelectorAll("form[action]")) links.add(f.action);
  const all=[...links];
  const low=u=>u.toLowerCase();
  return {
    title: document.title,
    h1: (document.querySelector("h1")?.innerText||"").slice(0,80),
    aspLinks: all.filter(u=>ASP.some(h=>low(u).includes(h))),
    lvnLinks: all.filter(u=>low(u).includes("lvnmatch")),
    felmat: all.filter(u=>low(u).includes("felmat")),
    rentracks: all.filter(u=>low(u).includes("rentracks")),
    outboundHosts: [...new Set(all.map(u=>{try{return new URL(u).host}catch{return""}}).filter(h=>h && !h.includes("iekatu-life")))].slice(0,25),
  };
}, ASP);
console.log("title:", info.title);
console.log("h1:", info.h1);
console.log("felmat:", info.felmat.length, JSON.stringify(info.felmat.slice(0,4)));
console.log("rentracks:", info.rentracks.length);
console.log("lvnmatch:", info.lvnLinks.length, JSON.stringify(info.lvnLinks.slice(0,4)));
console.log("ASP合計:", info.aspLinks.length);
console.log("外部送客先ホスト:", JSON.stringify(info.outboundHosts, null, 2));
await lp.screenshot({ path: "/tmp/iekatu_lp.png", fullPage: true });

fs.writeFileSync("/tmp/iekatu_check.json", JSON.stringify({ advertiser: adv, lp: info, lpUrl }, null, 2));
console.log("\n保存: /tmp/iekatu_check.json / スクショ iekatu_transparency.png, iekatu_lp.png");
console.log("ウィンドウは10分開いたままにします。");
await lp.waitForTimeout(600000);
await context.close();
