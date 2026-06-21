import { chromium } from "playwright";
import fs from "fs";

const lpUrl = process.argv[2] || "https://hikakusearch.com/a/fudousan-sbaikyaku/?saf_src=google_g";

// 中継ホスト → ASP名
function aspName(host) {
  const h = host.toLowerCase();
  if (h.includes("rentracks")) return "レントラックス";
  if (h.includes("felmat")) return "felmat";
  if (h.includes("a8.net")) return "A8.net";
  if (h.includes("afi-b") || h.includes("afb")) return "afb(afi-b)";
  if (h.includes("accesstrade")) return "アクセストレード";
  if (h.includes("affiliate-b")) return "afb/Caterie";
  if (h.includes("medipartner")) return "メディパートナー";
  if (h.includes("moshimo")) return "もしもアフィリエイト";
  if (h.includes("valuecommerce")) return "バリューコマース";
  if (h.includes("smart-c")) return "スマートC";
  if (h.includes("tg-affiliate")) return "TGアフィリエイト";
  if (h.includes("metps") || h.includes("presco")) return "Link-A/PRESCO系";
  return "(直リンク/不明)";
}
const ASP_HOSTS = /rentracks|felmat|a8\.net|afi-b|accesstrade|affiliate-b|medipartner|moshimo|valuecommerce|smart-c|tg-affiliate|metps|presco/i;

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 60, viewport: { width: 1300, height: 950 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

await page.goto(lpUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => { for (let y=0;y<Math.min(document.body.scrollHeight,15000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));} window.scrollTo(0,0); });
await page.waitForTimeout(1000);

// 全アフィリ/外部リンクを、近傍の見出し・ボタン文言とともに抽出
const raw = await page.evaluate((ASP_SRC) => {
  const ASP = new RegExp(ASP_SRC, "i");
  const host = location.host;
  const items = [];
  for (const a of document.querySelectorAll("a[href]")) {
    let h; try { h = new URL(a.href).host; } catch { continue; }
    if (h.includes(host.replace("www.", ""))) continue;          // 内部リンク除外
    // 見出し: 祖先をさかのぼって近いh2/h3/strongや画像alt
    let head = "";
    let el = a;
    for (let k=0;k<6 && el;k++){
      el = el.parentElement;
      if (!el) break;
      const hd = el.querySelector?.("h2,h3,h4,strong,.rank,.title");
      if (hd && hd.innerText.trim()) { head = hd.innerText.trim().slice(0,40); break; }
    }
    const img = a.querySelector?.("img");
    items.push({
      href: a.href,
      host: h,
      text: (a.innerText || "").trim().slice(0,40),
      alt: img ? (img.getAttribute("alt")||"").slice(0,40) : "",
      heading: head,
      isAsp: ASP.test(a.href),
    });
  }
  return items;
}, ASP_HOSTS.source);

// 重複URL除去
const seen = new Set();
const links = [];
for (const r of raw) { if (seen.has(r.href)) continue; seen.add(r.href); links.push(r); }

console.log(`外部/アフィリリンク ${links.length} 本を解決します...`);

// 各リンクを開いて最終遷移先（=案件サービス）を特定
const resolver = await context.newPage();
const out = [];
for (const l of links) {
  const rec = { ...l, asp: aspName(l.host) };
  // dna抽出
  const dnaM = l.href.match(/[?&]dna=(\d+)/); rec.dna = dnaM ? dnaM[1] : "";
  try {
    await resolver.goto(l.href, { waitUntil: "load", timeout: 25000 });
    await resolver.waitForTimeout(2500);
    rec.finalHost = new URL(resolver.url()).host;
    rec.service = (await resolver.title()).slice(0,60);
  } catch (e) {
    rec.service = "(解決失敗)";
    try { rec.finalHost = new URL(resolver.url()).host; } catch {}
  }
  out.push(rec);
  console.log(`[${rec.asp}] ${rec.heading||rec.alt||rec.text||"?"}  →  ${rec.finalHost}  | ${rec.service}  (dna=${rec.dna||"-"})`);
}

fs.writeFileSync("/tmp/hikaku_aspmap.json", JSON.stringify(out, null, 2));
console.log("\n保存: /tmp/hikaku_aspmap.json");
await context.close();
