import { chromium } from "playwright";
import fs from "fs";

// organic結果から rentracks リンクを集め、dnaごとに1本だけ解決する
const data = JSON.parse(fs.readFileSync("/tmp/lvnmatch_organic.json", "utf8"));
const byDna = new Map();
for (const x of data) {
  for (const u of x.aspLinks || []) {
    if (!/rentracks/i.test(u)) continue;
    const m = u.match(/[?&]dna=(\d+)/);
    if (!m) continue;
    const dna = m[1];
    if (!byDna.has(dna)) byDna.set(dna, { dna, url: u, fromHost: x.host, fromTitle: (x.title || "").slice(0, 30) });
  }
}
const targets = [...byDna.values()];
console.log(`ユニークdna: ${targets.length} 件を解決します`);

const userDataDir = "/tmp/chrome_user_data_lvn";
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, slowMo: 60, viewport: { width: 1300, height: 900 }, locale: "ja-JP",
  args: ["--disable-blink-features=AutomationControlled"],
});
await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const page = context.pages()[0] || (await context.newPage());

const out = [];
for (const t of targets) {
  const rec = { ...t };
  try {
    await page.goto(t.url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(3500); // JS/メタリダイレクト待ち
    rec.finalUrl = page.url();
    rec.finalHost = new URL(rec.finalUrl).host;
    rec.title = (await page.title()).slice(0, 80);
  } catch (e) {
    rec.error = String(e).slice(0, 120);
    try { rec.finalUrl = page.url(); rec.finalHost = new URL(rec.finalUrl).host; } catch {}
  }
  out.push(rec);
  console.log(`dna=${rec.dna}  →  ${rec.finalHost || "?"}  | ${rec.title || rec.error || ""}`);
}

fs.writeFileSync("/tmp/rentracks_resolved.json", JSON.stringify(out, null, 2));
console.log("\n保存: /tmp/rentracks_resolved.json");
await context.close();
