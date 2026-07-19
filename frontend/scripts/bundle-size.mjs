// バンドルサイズ計測・差分レポート（frontend CI から実行される）。
//
// Next 16 (Turbopack) はビルド時の per-route サイズ表を出力せず、チャンク名も
// 不透明ハッシュのためルート単位の First Load JS は取れない。ここでは
// Dependabot 更新等の判断材料として十分な集計値（総 JS/CSS gzip・共有 First
// Load JS）を測り、main のベースライン（octocov と同じく Actions Artifacts に
// 保存）との差分を PR コメント用 Markdown で出力する。
//
// 使い方:
//   node scripts/bundle-size.mjs measure                 # .next を測って bundle-size.json を書く
//   node scripts/bundle-size.mjs compare <base> <head>   # 差分 Markdown を stdout に出す
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const CHUNKS_DIR = ".next/static/chunks";
const MEDIA_DIR = ".next/static/media";
const OUT_FILE = "bundle-size.json";

function sumFiles(dir, ext, { gzip } = { gzip: true }) {
  let files = 0;
  let bytes = 0;
  let gzipBytes = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(ext)) continue;
    const path = join(dir, name);
    if (!statSync(path).isFile()) continue;
    const buf = readFileSync(path);
    files += 1;
    bytes += buf.length;
    if (gzip) gzipBytes += gzipSync(buf).length;
  }
  return { files, bytes, gzip: gzip ? gzipBytes : null };
}

function measure() {
  const js = sumFiles(CHUNKS_DIR, ".js");
  const css = sumFiles(CHUNKS_DIR, ".css");
  // rootMainFiles = 全ページが必ず読む共有チャンク（≒ 共有 First Load JS）
  const manifest = JSON.parse(readFileSync(".next/build-manifest.json", "utf8"));
  let shared = { files: 0, bytes: 0, gzip: 0 };
  for (const rel of manifest.rootMainFiles ?? []) {
    const buf = readFileSync(join(".next", rel));
    shared = {
      files: shared.files + 1,
      bytes: shared.bytes + buf.length,
      gzip: shared.gzip + gzipSync(buf).length,
    };
  }
  // フォント等の静的アセット（woff2 は圧縮済みなので raw バイトのみ）
  let media = { files: 0, bytes: 0, gzip: null };
  try {
    media = sumFiles(MEDIA_DIR, "", { gzip: false });
  } catch {
    // media ディレクトリが無いビルドもある
  }
  const result = { sharedFirstLoadJs: shared, totalJs: js, totalCss: css, media };
  writeFileSync(OUT_FILE, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

const kb = (n) => (n == null ? "-" : `${(n / 1024).toFixed(1)} KB`);

function diffCell(base, head) {
  if (base == null || head == null) return "-";
  const d = head - base;
  if (d === 0) return "±0";
  const sign = d > 0 ? "+" : "";
  return `${sign}${(d / 1024).toFixed(1)} KB`;
}

function compare(basePath, headPath) {
  const head = JSON.parse(readFileSync(headPath, "utf8"));
  let base = null;
  try {
    base = JSON.parse(readFileSync(basePath, "utf8"));
  } catch {
    // ベースライン未取得（main でまだ計測が走っていない等）は差分なしで表示
  }
  const rows = [
    ["共有 First Load JS (gzip)", "sharedFirstLoadJs", "gzip"],
    ["JS 合計 (gzip)", "totalJs", "gzip"],
    ["CSS 合計 (gzip)", "totalCss", "gzip"],
    ["静的アセット (raw)", "media", "bytes"],
  ];
  const lines = [
    "<!-- bundle-size -->",
    "## 📦 バンドルサイズ",
    "",
    "| 指標 | main | この PR | 差分 |",
    "|---|---:|---:|---:|",
  ];
  for (const [label, key, field] of rows) {
    const b = base?.[key]?.[field];
    const h = head?.[key]?.[field];
    lines.push(`| ${label} | ${kb(b)} | ${kb(h)} | ${diffCell(b, h)} |`);
  }
  if (!base) {
    lines.push("", "> main のベースラインがまだ無いため差分は表示していません。");
  }
  console.log(lines.join("\n"));
}

const [mode, a, b] = process.argv.slice(2);
if (mode === "measure") measure();
else if (mode === "compare") compare(a, b);
else {
  console.error("usage: bundle-size.mjs measure | compare <base.json> <head.json>");
  process.exit(1);
}
